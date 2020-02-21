interface ValidationError {
  msg: string
  param: string
  value: string
}

export const errorFormatter = ({ msg, param, value }: ValidationError) => {
  return { [param]: msg, value: value }
}
