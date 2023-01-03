// {email: {$regex: /nilaypo/, '$options': 'i'}, nilay: {$regex: //i}}
class ApiFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  filter() {
    const queryObj = { ...this.queryStr };
    const excludeFields = ['sort', 'field', 'page', 'limit'];
    excludeFields.forEach((el) => {
      delete queryObj[`${el}`];
    });
    let queryString = JSON.stringify(queryObj);

    queryString = queryString.replace(/\b(gte|lt|gt|lte)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryString));
    return this;
  }

  sort() {
    if (this.queryStr.sort) {
      const sortStr = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortStr);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryStr.field) {
      const field = this.queryStr.field.split(',').join(' ');
      console.log(field);
      this.query = this.query.select(field);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    // page=3 & limit = 6   1-6 page = 1 || 7-12 page = 2 || 13-18 page = 3
    const page = +this.queryStr.page || 1;
    const limit = +this.queryStr.limit || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = ApiFeatures;
