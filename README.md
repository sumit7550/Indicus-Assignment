# Indicus-Assignment
Automation Assignment
[Starting Objective]: Login to saucedemo.com with username standard_user and password secret_sauce. Add the first two products to the cart. Open the cart and verify the cart shows 2 items.
============================================================

--- Step 1 ---
Thought: I need to start by navigating to the target website, saucedemo.com.
Action : navigate with params: { url: 'https://www.saucedemo.com/' }
Executing: Navigate to https://www.saucedemo.com/

--- Step 2 ---
Thought: Now that I am on the login page, I need to input the username 'standard_user' into the username input field.
Action : type with params: { element_id: 'idx-0', text: 'standard_user' }
Executing: Type "standard_user" into idx-0

--- Step 3 ---
Thought: I need to enter the password 'secret_sauce' into the password input field.
Action : type with params: { element_id: 'idx-1', text: 'secret_sauce' }
Executing: Type "secret_sauce" into idx-1

--- Step 4 ---
Thought: I will click the login button to proceed.
Action : click with params: { element_id: 'idx-2' }
Executing: Click element idx-2

--- Step 5 ---
Thought: I have logged in. Now I need to add the first product (Sauce Labs Backpack) to the cart.
Action : click with params: { element_id: 'idx-2' }
Executing: Click element idx-2

--- Step 6 ---
Thought: Now I need to add the second product (Sauce Labs Bike Light) to the cart.
Action : click with params: { element_id: 'idx-3' }
Executing: Click element idx-3

--- Step 7 ---
Thought: Both items are added. Now I need to navigate to the cart page by clicking the shopping cart container.
Action : click with params: { element_id: 'idx-1' }
Executing: Click element idx-1

--- Step 8 ---
Thought: I am inside the cart. I can see the list of items. The cart badge context confirms 2 items are present. The objective is met.
Action : complete with params: {
  success: true,
  message: 'Successfully logged in, added the first two items to the cart, opened the cart, and verified 2 items.'
}

============================================================
[SUCCESS]: Successfully logged in, added the first two items to the cart, opened the cart, and verified 2 items.
============================================================
