export const containsSearchTerm = (
  searchPhrase: string,
  entry: any
): boolean => {
  if (searchPhrase.length > 0) {
    const keys = Object.keys(entry);

    let searchKey;
    if (searchPhrase.includes(":")) {
      const searchArr = searchPhrase.split(":");
      searchKey = searchArr[0];
      searchPhrase = searchArr[1];
    }
    for (let i = 0; i < keys.length; i++) {
      const value = entry[keys[i]];
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
  } else {
    return false;
  }
};
