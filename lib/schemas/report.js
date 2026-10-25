import { z } from "zod";
import { ymd } from "./transaction";
export const rangeQuery = z.object({ from: ymd.optional(), to: ymd.optional(), group: z.enum(["day", "month"]).optional() });
