const nodemailer = require("nodemailer");
const pug = require("pug");
const { htmlToText } = require("html-to-text");
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Nilay Pophalkar ${process.env.EMAIL_FROM}`;
  }

  createTransport() {
    // if (process.env.NODE_ENV === 'production') {
    //   // gmail
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_GMAIL_USERNAME,
        pass: process.env.EMAIL_GMAIL_PASS,
      },
    });
    // }
    // return nodemailer.createTransport({
    //   host: process.env.Email_host,
    //   port: process.env.Email_port,
    //   auth: {
    //     user: process.env.Email_user,
    //     pass: process.env.Email_pass,
    //   },
    // });
  }

  async send(template, subject) {
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    const mailOptions = {
      from: "Nilay <nilay@gmail.com>",
      to: this.to,
      subject,
      html,
      // text: htmlToText.fromString(html),
      text: htmlToText(html),
    };

    await this.createTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to natours family!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your password reset token will be valid for only 10 minutes!"
    );
  }
};
