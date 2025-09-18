import { storyblokInit, apiPlugin } from "@storyblok/react";
import components from "@/storyblok-components"; // create this map when ready

storyblokInit({
  accessToken: process.env.NEXT_PUBLIC_STORYBLOK_TOKEN,
  use: [apiPlugin],
  components,
});
