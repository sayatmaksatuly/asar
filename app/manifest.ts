import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest {
  return {name:"ASAR",short_name:"ASAR",description:"Платформа взаимопомощи в Казахстане",start_url:"/",display:"standalone",background_color:"#fffdf8",theme_color:"#236b4c",icons:[{src:"/brand/app-icon.svg",sizes:"any",type:"image/svg+xml"}]};
}
