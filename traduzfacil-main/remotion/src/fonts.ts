import { loadFont as loadDisplay } from "@remotion/google-fonts/Poppins";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

export const display = loadDisplay("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

export const body = loadBody("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
}).fontFamily;
