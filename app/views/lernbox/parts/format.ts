export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function groupCode(value: string) {
  return value.match(/.{1,4}/g)?.join(" ") ?? value;
}
