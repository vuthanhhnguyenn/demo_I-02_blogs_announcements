export function RequiredMark() {
  return <span className="text-destructive ml-0.5 text-xs">*</span>;
}

export function OptionalMark() {
  return (
    <span className="bg-muted text-muted-foreground ml-1.5 inline-flex items-center rounded-sm px-1.5 py-0.5 align-middle text-xs leading-none font-medium">
      任意
    </span>
  );
}
