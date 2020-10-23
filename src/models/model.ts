export default abstract class Model {
  _id?: string
  date: string
  constructor() {
    this.date = new Date().toISOString()
  }
}
