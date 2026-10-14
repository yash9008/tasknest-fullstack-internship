import { createDemoService } from "./demoService.js";
import { createApiService } from "./apiService.js";
export const service =
  import.meta.env.VITE_DATA_MODE === "api"
    ? createApiService()
    : createDemoService(window.localStorage);
