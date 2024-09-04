import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { render } from "ejs";
import env from "dotenv"
import e from "express";
env.config();

const app = express();
const port = 3000;


const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let users = [];

async function getAllUsers(){
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",[currentUserId]);                
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code)}
  );
  console.log("hello");
  console.log(countries);
  return countries;
}

app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getAllUsers();
  if (!currentUser){
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: "navy",
    });
  } else {
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
  }
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  console.log(input);
  
  try {
    const result = await db.query(
      "SELECT country_code FROM all_country_codes WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        `INSERT INTO visited_countries (country_code, user_id) VALUES ('${countryCode}', '${currentUserId}')`);
      console.log("added successfully");
      res.redirect("/");
    } catch (err) {
      console.log("not added");
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});


app.post("/user", async (req, res) => {
  var user = req.body["user"];
  if (user === "new"){
    res.render("new.ejs");
  } else {
    currentUserId = user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  const data = await db.query("INSERT INTO users (name , color) VALUES ($1, $2) RETURNING *;", [name, color]);
  currentUserId = data.rows[0].id;
  res.redirect("/");

});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
