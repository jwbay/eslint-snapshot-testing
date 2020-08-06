/** @test should handle single line errors */
let somethingFoo

/** @test should handle indented single line errors */
function nested() {
    let somethingFoo
}

/** @test should handle multiline errors */
class SomethingFoo {
    bar() {}
}

/** @test should handle indented multiline errors */
function nested2() {
    class NestedFoo {
        bar() {}
    }
}
