const text = Deno.readTextFile("./people.json");

text.then((response) => console.log(response));


const net = fetch("https://deno.land/");

net.then((response) => console.log(response));