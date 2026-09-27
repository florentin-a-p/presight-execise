import { faker } from "@faker-js/faker";
import { pathToFileURL } from "node:url";
import { DEFAULT_DB_PATH, openDb, type DB } from "./db.js";

export const NATIONALITIES = [
  "American", "Argentinian", "Australian", "Brazilian", "British", "Canadian", "Chinese",
  "Danish", "Dutch", "Egyptian", "Emirati", "Filipino", "Finnish", "French", "German",
  "Greek", "Indian", "Indonesian", "Irish", "Italian", "Japanese", "Kenyan", "Korean",
  "Mexican", "Moroccan", "Nigerian", "Norwegian", "Pakistani", "Polish", "Portuguese",
  "Saudi", "Singaporean", "South African", "Spanish", "Swedish", "Swiss", "Thai",
  "Turkish", "Ukrainian", "Vietnamese",
];

export const HOBBIES = [
  "Reading", "Hiking", "Cooking", "Gaming", "Photography", "Cycling", "Running", "Swimming",
  "Gardening", "Painting", "Yoga", "Chess", "Fishing", "Traveling", "Dancing", "Singing",
  "Guitar", "Piano", "Knitting", "Baking", "Camping", "Climbing", "Surfing", "Skiing",
  "Writing", "Birdwatching", "Pottery", "Woodworking", "Calligraphy", "Astronomy",
  "Board Games", "Volunteering", "Martial Arts", "Tennis", "Football", "Basketball",
  "Film", "Podcasting", "Origami", "Sailing",
];

// Zipf-like weights so facet counts differ meaningfully instead of being uniform.
const weighted = (items: string[]) => items.map((value, i) => ({ value, weight: 1 / (i + 1) ** 0.8 }));

export interface SeedOptions {
  count?: number;
  seed?: number;
}

export function seed(db: DB, { count = 10_000, seed = 42 }: SeedOptions = {}): number {
  faker.seed(seed);
  const nationalities = weighted(faker.helpers.shuffle([...NATIONALITIES]));
  const hobbyWeights = weighted(faker.helpers.shuffle([...HOBBIES]));

  const insertHobby = db.prepare("INSERT INTO hobbies (name) VALUES (?) RETURNING id");
  const insertUser = db.prepare(
    `INSERT INTO users (avatar, first_name, last_name, age, nationality)
     VALUES (@avatar, @first_name, @last_name, @age, @nationality) RETURNING id`,
  );
  const link = db.prepare("INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)");

  db.transaction(() => {
    db.exec("DELETE FROM user_hobbies; DELETE FROM users; DELETE FROM hobbies;");
    const hobbyIds = new Map(HOBBIES.map((h) => [h, (insertHobby.get(h) as { id: number }).id]));

    for (let i = 0; i < count; i++) {
      const sex = faker.person.sexType();
      const first_name = faker.person.firstName(sex);
      const last_name = faker.person.lastName();
      const { id } = insertUser.get({
        avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(`${first_name}-${last_name}-${i}`)}`,
        first_name,
        last_name,
        age: faker.number.int({ min: 18, max: 80 }),
        nationality: faker.helpers.weightedArrayElement(nationalities),
      }) as { id: number };

      const hobbies = new Set<string>();
      const target = faker.number.int({ min: 0, max: 10 });
      while (hobbies.size < target) hobbies.add(faker.helpers.weightedArrayElement(hobbyWeights));
      for (const h of hobbies) link.run(id, hobbyIds.get(h));
    }
  })();

  db.exec("ANALYZE");
  return count;
}

// CLI: `yarn seed [count]`
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const count = Number(process.argv[2] ?? process.env.SEED_COUNT ?? 10_000);
  const db = openDb();
  const started = Date.now();
  seed(db, { count });
  console.log(`Seeded ${count} users into ${DEFAULT_DB_PATH} in ${Date.now() - started}ms`);
  db.close();
}
