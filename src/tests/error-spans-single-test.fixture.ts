// should handle single line errors
let somethingFoo2

// should handle indented single line errors
function nestedFoo() {
    let somethingFoo
}

// should handle multiline errors
class SomethingFoo2 {
    bar() {}
}

// should handle indented multiline errors
function nested3() {
    class NestedFoo {
        bar() {}
    }
}
