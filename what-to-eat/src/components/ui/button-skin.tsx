export type ButtonSkinTone = "primary" | "secondary" | "danger";

const buttonSkinSlices = [
  "top-left",
  "top",
  "top-right",
  "left",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right"
] as const;

export function ButtonSkin({ tone }: { tone: ButtonSkinTone }) {
  return (
    <span aria-hidden="true" className="app-button-skin" data-tone={tone}>
      {buttonSkinSlices.map((slice) => (
        <span className="app-button-skin-slice" data-slice={slice} key={slice} />
      ))}
    </span>
  );
}
