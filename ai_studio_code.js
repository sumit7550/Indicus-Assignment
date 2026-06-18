import { chromium } from 'playwright';
import OpenAI from 'openai';
import process from 'process';

// Ensure the OpenAI API Key is present
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not defined.');
  process.exit(1);
}

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are an AI web automation agent. Your job is to complete the user's objective on a website by choosing step-by-step actions.

/**
 * Scans the current page, assigns temporary dynamic IDs to interactive elements,
 * and compiles context text to assist the LLM decision loop.
 */
async function extractPageState(page) {
  try {
    return await page.evaluate(() => {
      // Remove previous markup tags if any exist
      document.querySelectorAll('[data-interactive-id]').forEach(el => {
        el.removeAttribute('data-interactive-id');
      });

      const selectors = 'button, input, select, textarea, a, [role="button"], [role="link"], .shopping_cart_link, .shopping_cart_badge';
      const elements = document.querySelectorAll(selectors);
      const interactiveList = [];

      elements.forEach((el, index) => {
        const id = `idx-${index}`;
        el.setAttribute('data-interactive-id', id);

        const attributes = {};
        const keysToKeep = ['id', 'name', 'placeholder', 'class', 'type', 'value', 'data-test'];
        for (let attr of el.attributes) {
          if (keysToKeep.includes(attr.name)) {
            attributes[attr.name] = attr.value;
          }
        }

        let text = el.innerText || el.textContent || '';
        text = text.replace(/\s+/g, ' ').trim();

        interactiveList.push({
          id,
          tagName: el.tagName.toLowerCase(),
          text,
          attributes
        });
      });

      // Extract general layout headings or identifiers for confirmation context
      const contextSelectors = 'h1, h2, h3, .inventory_item_name, .inventory_item_price, .shopping_cart_badge, .error-message-container';
      const contextElements = document.querySelectorAll(contextSelectors);
      const pageTextContext = Array.from(contextElements).map(el => {
        return `${el.className || el.tagName}: ${el.innerText.trim()}`;
      }).join('\n');

      return {
        elements: interactiveList,
        contextText: pageTextContext
      };
    });
  } catch (error) {
    console.error('Failed to extract page state:', error);
    return { elements: [], contextText: '' };
  }
}

/**
 * Main execution loop
 */
async function runAgent(objective) {
  // Launch the Chromium browser instance (non-headless to visually monitor progress)
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const history = [];
  const maxSteps = 15;
  let step = 0;

  console.log(`\n[Starting Objective]: ${objective}`);
  console.log('='.repeat(60));

  while (step < maxSteps) {
    step++;
    const currentUrl = page.url();
    const pageState = await extractPageState(page);

    const prompt = `
Objective: ${objective}
Current URL: ${currentUrl}

Interactive Elements:
${JSON.stringify(pageState.elements, null, 2)}

Helpful Page Context:
${pageState.contextText}

History of Actions Taken:
${JSON.stringify(history, null, 2)}
`;

    let decision;
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.0,
        response_format: { type: 'json_object' }
      });

      decision = JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('[Error calling LLM/Parsing response]:', error);
      break;
    }

    const { thought, action, params = {} } = decision;

    console.log(`\n--- Step ${step} ---`);
    console.log(`Thought: ${thought}`);
    console.log(`Action : ${action} with params:`, params);

    // Keep history tracking
    history.push({ step, thought, action, params });

    // Execute designated action
    if (action === 'navigate') {
      const targetUrl = params.url;
      console.log(`Executing: Navigate to ${targetUrl}`);
      await page.goto(targetUrl);
      await page.waitForLoadState('networkidle');

    } else if (action === 'click') {
      const elementId = params.element_id;
      const selector = `[data-interactive-id="${elementId}"]`;
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`Executing: Click element ${elementId}`);
        await page.click(selector);
        await page.waitForTimeout(1000); // Wait briefly for state transitions
      } catch (error) {
        console.error(`Failed to click dynamic element [${elementId}]:`, error.message);
        history.push({ step, error: `Failed to click ${elementId}` });
      }

    } else if (action === 'type') {
      const elementId = params.element_id;
      const textToType = params.text || '';
      const selector = `[data-interactive-id="${elementId}"]`;
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`Executing: Type "${textToType}" into ${elementId}`);
        await page.fill(selector, '');
        await page.type(selector, textToType, { delay: 50 });
      } catch (error) {
        console.error(`Failed to type into dynamic element [${elementId}]:`, error.message);
        history.push({ step, error: `Failed to type into ${elementId}` });
      }

    } else if (action === 'complete') {
      const success = params.success || false;
      const message = params.message || 'Termination signal sent.';
      console.log('\n' + '='.repeat(60));
      if (success) {
        console.log(`[SUCCESS]: ${message}`);
      } else {
        console.log(`[FAILURE]: ${message}`);
      }
      console.log('='.repeat(60));
      break;

    } else {
      console.log(`Unknown action received: ${action}`);
      break;
    }
  }

  if (step >= maxSteps) {
    console.log('\n' + '='.repeat(60));
    console.log('[FAILURE]: Maximum interaction steps reached without a completion status.');
    console.log('='.repeat(60));
  }

  // Grace period before closing the browser window
  await page.waitForTimeout(4000);
  await browser.close();
}

// Read input instruction from argument or fall back to default
const userScenario = process.argv.slice(2).join(' ') || 
  "Login to saucedemo.com with username standard_user and password secret_sauce. Add the first two products to the cart. Open the cart and verify the cart shows 2 items.";

runAgent(userScenario);
