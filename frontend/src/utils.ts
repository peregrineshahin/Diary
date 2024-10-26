export const formatDate = (dateString: string | number | Date) => {
  const date = new Date(dateString);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const year = date.getFullYear();
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  let hours = date.getHours();
  const minutes = date.getMinutes();

  const ampm = hours < 12 ? "AM" : "PM";
  hours = hours % 12 || 12;

  const formattedMinutes = `${minutes < 10 ? "0" : ""}${minutes}`;
  const formattedDate = `${month} ${day}, ${year}, at ${hours}:${formattedMinutes} ${ampm}`;

  return formattedDate;
};
