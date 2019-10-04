export const containsSearchTerm = (
  searchPhrase: string,
  entry: any
): boolean => {
  searchPhrase = searchPhrase.trim();
  if (searchPhrase.length === 0) {
    return false;
  }
  const keys = Object.keys(entry);

  let searchKey;
  if (searchPhrase.includes(":")) {
    const searchArr = searchPhrase.split(":");
    searchKey = searchArr[0].trim();
    searchPhrase = searchArr[1].trim();
  }
  for (let i = 0; i < keys.length; i++) {
    const value = entry[keys[i]].trim();
    if (
      ((!!searchKey &&
        keys[i].toLowerCase().includes(searchKey.toLowerCase())) ||
        !searchKey) &&
      !!value &&
      value
        .toString()
        .toLowerCase()
        .includes(searchPhrase.toLowerCase())
    ) {
      return true;
    }
  }
  return false;
};
