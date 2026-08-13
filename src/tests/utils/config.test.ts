import { getConfig } from "../../utils/config.js";

test("useNerdFont defaults on", () => expect(getConfig().useNerdFont).toBe(true));
test("history import defaults on with max 10000", () => expect(getConfig().history).toEqual({ import: true, max: 10000 }));
