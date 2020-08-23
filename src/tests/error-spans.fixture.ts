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

/** @test should format adjacent errors correctly */
function adjacentErrors() {
    let foo, foo2, foo3;
    let foo4, foo5;

    let foo6;
    let thisIsFine;
}

/** @test should collapse adjacent errors correctly */
function collapsesAdjacentErrors() {
    let foo, thisIsFine, foo2, thisIsAlsoFine, foo3;
}
