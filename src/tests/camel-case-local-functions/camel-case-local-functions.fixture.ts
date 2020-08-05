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
