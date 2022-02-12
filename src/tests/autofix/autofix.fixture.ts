/**
 * @test rule with unaccepted autofix should display errors normally
 */
const namedFooFirst = 'not fixed'
 
/**
 * @test rule with accepted autofix should display errors before and code after fix
 * @acceptFix
 */
const namedFooSecond = 'fixed'

/**
 * @test rule with nested reports and unaccepted autofix should display errors normally
 */
class SomethingFooFirst {
    multiline() {
        const foo = 42;
    }
}
 
/**
 * @test rule with nested reports and accepted autofix should display errors before and code after fix
 * @acceptFix
 */
class SomethingFooSecond {
    multiline() {
        const foo = 42;
    }
}

/**
 * @test rule with unstable fix should show remaining errors after applying fix
 * @ruleOptions [{ "badFix": true }]
 * @acceptFix
 */
class SomethingFooThird {
    multiline() {
        const foo = 42;
    }
}
