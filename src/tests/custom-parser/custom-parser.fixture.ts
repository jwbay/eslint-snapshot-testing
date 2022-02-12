/**
 * @test should parse TypeScript
 */
interface Test {
    thing(): void;
}

const fooTest = 'foo';

const testObj: Test = {
    thing() {}
}
