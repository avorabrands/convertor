declare module "mammoth/mammoth.browser.js" {
  interface Result { value: string }
  const mammoth: {
    convertToHtml(input: { arrayBuffer: ArrayBuffer }, options?: { styleMap?: string[] }): Promise<Result>;
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<Result>;
  };
  export default mammoth;
}
declare module "pdfjs-dist/legacy/build/pdf.mjs";
declare module "@fontsource-variable/inter";
