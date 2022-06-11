/**
 * @test valid cases
 */
function shouldPass() {}

shouldPass()

/** @test invalid cases */
function ShouldFail() {}

function lalala() {
    ShouldFail()
}

ShouldFail()

/**
 * @test should ignore .tsx files
 * @filename someFile.tsx
 */
function ShouldPass() {}

ShouldPass()

/**
 * @test should ignore .tsx files with spaces
 * @filename some other file.tsx
 */
function ShouldAlsoPass() {}

ShouldAlsoPass()
