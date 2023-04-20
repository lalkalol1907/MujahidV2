import {timeFormat} from "../embeds"
import {expect, test} from '@jest/globals';

test('Time formatting', () => {
    expect(timeFormat(3600)).toBe("01:00:00")
})
