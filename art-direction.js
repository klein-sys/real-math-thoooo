/* Shared palette and pixel details for the world and battle arenas. */
function paintGround(context, kind, path, x, y, size) {
  const colors = kind === 'volcano' ? ['#493038','#694142'] :
    kind === 'cave' ? ['#303a4c','#47536a'] :
    kind === 'interior' ? ['#6c4835','#8a6043'] :
    path ? ['#a6794d','#bf925c'] : ['#536c37','#718c46'];
  const noise = (Math.imul(x + 37, 1597334677) ^ Math.imul(y + 71, 3812015801)) >>> 0;
  context.fillStyle = colors[0];
  context.fillRect(x, y, size, size);
  context.fillStyle = colors[1];
  context.fillRect(x + noise % (size - 4), y + (noise >>> 8) % (size - 4), 4, 2);
  context.fillRect(x + (noise >>> 16) % (size - 3), y + (noise >>> 24) % (size - 3), 2, 2);
  if (kind === 'interior') context.fillRect(x, y + size - 2, size, 1);
}
