import { Task } from "../store/corestore";

export default function downloadCSV(tasks: Task[]) {
  // TODO: Check if all objects have all of the keys
  // If not, should add

  // It's possible the data could be incomplete

  if (tasks.length === 0) return null;

  const fileName = tasks[0].site.name + "-" + tasks[0].id;

  let dataString =
    "data:text/csv;charset=utf-8," +
    "site id," +
    "siteName," +
    Object.keys(tasks[0].entries[0]).join(",") +
    "\n";

  tasks.forEach(site => {
    // Add info from the site
    site.entries.forEach(entry => {
      console.log(entry);
      dataString +=
        site.id +
        ", " +
        site.site.name +
        ", " +
        Object.values(entry).join(",") +
        "\r\n";
    });
  });

  const encodedURI = encodeURI(dataString);
  const link = document.createElement("a");
  link.setAttribute("href", encodedURI);
  link.setAttribute("download", `${fileName}.csv`);
  link.click();
}
