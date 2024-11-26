import bcrypt from 'bcrypt';

const saltRounds = 10;
const password = 'admin123';

bcrypt.hash(password, saltRounds).then(hash => {
  console.log(hash);
});
