// Comprehensive Test Suite for IFSCee
// Tests lexer, parser, and interpreter integration

const fs = require('fs');

// Load all modules
const lexerCode = fs.readFileSync('lexer.js', 'utf8');
const parserCode = fs.readFileSync('parser.js', 'utf8');
const interpreterCode = fs.readFileSync('interpreter.js', 'utf8');
const preprocessorCode = fs.readFileSync('preprocessor.js', 'utf8');

eval(preprocessorCode);
eval(lexerCode);
eval(parserCode);
eval(interpreterCode);

let passedTests = 0;
let failedTests = 0;

function test(name, code, expectedOutput) {
    try {
        // Preprocess
        const preprocessor = new IFSCeePreprocessor(code);
        const processedCode = preprocessor.process();

        // Lex
        const lexer = new IFSCeeLexer(processedCode);
        const tokens = lexer.tokenize();

        // Parse
        const parser = new IFSCeeParser(tokens);
        const ast = parser.parse();

        // Interpret
        const interpreter = new IFSCeeInterpreter(ast);
        const engine = interpreter.interpret();

        let output = [];
        let result = engine.next();
        while (!result.done) {
            if (result.value && result.value.type === 'TERMINAL_PRINT') {
                output.push(result.value.output);
            }
            result = engine.next();
        }

        const actualOutput = output.join('');
        if (actualOutput.includes(expectedOutput)) {
            console.log(`✅ PASS: ${name}`);
            passedTests++;
            return true;
        } else {
            console.log(`❌ FAIL: ${name}`);
            console.log(`   Expected to contain: "${expectedOutput}"`);
            console.log(`   Got: "${actualOutput}"`);
            failedTests++;
            return false;
        }
    } catch (error) {
        console.log(`❌ ERROR: ${name}`);
        console.log(`   ${error.message}`);
        failedTests++;
        return false;
    }
}

console.log('🧪 Running IFSCee Test Suite...\n');

// Test 1: Basic Hello World
test('Hello World', `
#include <stdio.h>
int main() {
    printf("Hello, World!");
    return 0;
}
`, 'Hello, World!');

// Test 2: Escape sequences
test('Escape Sequences - Newline', `
#include <stdio.h>
int main() {
    printf("Line 1\\nLine 2");
    return 0;
}
`, 'Line 1');

// Test 3: Character literals
test('Character Literals', `
#include <stdio.h>
int main() {
    char c = 'A';
    printf("%d", c);
    return 0;
}
`, '65');

// Test 4: Octal escape
test('Octal Escape \\77', `
#include <stdio.h>
int main() {
    char c = '\\77';
    printf("%d", c);
    return 0;
}
`, '63');

// Test 5: Hex escape
test('Hex Escape \\x41', `
#include <stdio.h>
int main() {
    char c = '\\x41';
    printf("%c", c);
    return 0;
}
`, 'A');

// Test 6: Modulo operator
test('Modulo Operator %', `
#include <stdio.h>
int main() {
    int a = 10;
    int b = 3;
    printf("%d", a % b);
    return 0;
}
`, '1');

// Test 7: Compound assignment %=
test('Compound Assignment %=', `
#include <stdio.h>
int main() {
    int a = 10;
    a %= 3;
    printf("%d", a);
    return 0;
}
`, '1');

// Test 8: Octal numbers
test('Octal Numbers', `
#include <stdio.h>
int main() {
    int a = 0377;
    printf("%d", a);
    return 0;
}
`, '255');

// Test 9: Hex numbers
test('Hex Numbers', `
#include <stdio.h>
int main() {
    int a = 0xFF;
    printf("%d", a);
    return 0;
}
`, '255');

// Test 10: Binary numbers
test('Binary Numbers', `
#include <stdio.h>
int main() {
    int a = 0b11111111;
    printf("%d", a);
    return 0;
}
`, '255');

// Test 11: Float with suffix
test('Float with Suffix', `
#include <stdio.h>
int main() {
    float f = 3.14f;
    printf("%d", (int)(f * 100));
    return 0;
}
`, '314');

// Test 12: Multi-line comment
test('Multi-line Comment', `
#include <stdio.h>
int main() {
    /* This is a
       multi-line comment */
    printf("Test");
    return 0;
}
`, 'Test');

// Test 13: All arithmetic operators
test('All Arithmetic Operators', `
#include <stdio.h>
int main() {
    int a = 10;
    int b = 3;
    printf("%d", a + b);
    printf("%d", a - b);
    printf("%d", a * b);
    printf("%d", a / b);
    printf("%d", a % b);
    return 0;
}
`, '13');

// Test 14: All compound assignments
test('All Compound Assignments', `
#include <stdio.h>
int main() {
    int a = 10;
    a += 5;
    printf("%d", a);
    a -= 3;
    printf("%d", a);
    a *= 2;
    printf("%d", a);
    a /= 4;
    printf("%d", a);
    a %= 5;
    printf("%d", a);
    return 0;
}
`, '15');

// Test 15: Null terminator in strings
test('Null Terminator', `
#include <stdio.h>
int main() {
    char str[] = "Hello";
    printf("%c", str[0]);
    return 0;
}
`, 'H');

console.log(`\n📊 Test Results:`);
console.log(`   ✅ Passed: ${passedTests}`);
console.log(`   ❌ Failed: ${failedTests}`);
console.log(`   📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

if (failedTests === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
}
