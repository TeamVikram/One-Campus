const usedIds = new Set();

function generateUniqueAlphaNumericId(length = 6) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;

  if (usedIds.size >= Math.pow(charactersLength, length)) {
    throw new Error("All possible IDs have been used.");
  }

  let id;
  do {
    id = "";
    for (let i = 0; i < length; i++) {
      id += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
  } while (usedIds.has(id));

  usedIds.add(id);
  return id;
}

export default generateUniqueAlphaNumericId;
