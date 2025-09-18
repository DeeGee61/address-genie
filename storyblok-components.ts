import { storyblokEditable } from "@storyblok/react/rsc";

/* Temporary stubs so the editor renders something */
function Passthrough({ blok }: any) {
  return (
    <pre {...storyblokEditable(blok)} style={{background:"#f6f8fa",padding:12,borderRadius:8}}>
      {blok.component}\n{JSON.stringify(blok, null, 2)}
    </pre>
  );
}

const components = {
  teaser: Passthrough,
  grid: Passthrough,
  page_home: Passthrough,
  hero_simple: Passthrough,
  addressgenie_cta_button: Passthrough,
  section_rich: Passthrough,
};

export default components;
