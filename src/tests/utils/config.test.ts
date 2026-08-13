import { getConfig } from "../../utils/config.js";

test("useNerdFont defaults on", () => expect(getConfig().useNerdFont).toBe(true));
