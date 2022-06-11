// should handle indented single line errors
function nestedFoo() {
	let somethingFoo
}

// should handle multiline errors
class SomethingFoo3 {
	bar() {}
}

// should handle indented multiline errors
function nested4() {
	class NestedFoo {
		bar() {}
	}
}
