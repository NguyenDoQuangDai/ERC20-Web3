let list = document.querySelector("#mylist");
let items = document.querySelectorAll("#mylist li");
for (let i = 0; i < items.length; i++) {
  list.removeChild(items[i]);
  list.insertBefore(items[i], items[i + 2]);
}