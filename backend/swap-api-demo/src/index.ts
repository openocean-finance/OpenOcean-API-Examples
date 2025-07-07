import { getGasPrice, getTokenList, allowance, approve, quote, swap } from "./lib";


// Test cases
async function runTests() {
  try {
    console.log('Starting tests...');

    // Test getGasPrice
    console.log('\nTesting getGasPrice:');
    await getGasPrice();

    // Test getTokenList
    console.log('\nTesting getTokenList:');
    await getTokenList();

    // Test allowance
    console.log('\nTesting allowance:');
    await allowance();

    // Test approve
    console.log('\nTesting approve:');
    await approve();

    // Test quote
    console.log('\nTesting quote:');
    await quote();

    // Test swap
    console.log('\nTesting swap:');
    await swap();


    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run tests
runTests();
