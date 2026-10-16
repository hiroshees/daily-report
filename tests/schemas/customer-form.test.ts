import {
  CustomerFormSchema,
  EMPTY_CUSTOMER,
  toCustomerFormValues,
  toCustomerRequest,
} from '@/schemas/customer-form'

const messagesOf = (values: Partial<typeof EMPTY_CUSTOMER>) => {
  const result = CustomerFormSchema.safeParse({
    ...EMPTY_CUSTOMER,
    company_name: '会社',
    ...values,
  })
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('CustomerFormSchema', () => {
  it('会社名のみで有効。任意項目は未入力でよい', () => {
    expect(messagesOf({})).toEqual([])
  })

  it('会社名は必須。空白のみも不可', () => {
    expect(messagesOf({ company_name: '' })).toEqual(['会社名は必須項目です'])
    expect(messagesOf({ company_name: '   ' })).toEqual(['会社名は必須項目です'])
  })

  it('文字数の上限（会社名200・担当者100・電話30・メール255・住所500）', () => {
    expect(messagesOf({ company_name: 'あ'.repeat(201) })).toEqual([
      '会社名は200文字以内で入力してください',
    ])
    expect(messagesOf({ contact_person: 'あ'.repeat(101) })).toEqual([
      '担当者名は100文字以内で入力してください',
    ])
    expect(messagesOf({ phone: '1'.repeat(31) })).toEqual([
      '電話番号は30文字以内で入力してください',
    ])
    expect(messagesOf({ address: 'あ'.repeat(501) })).toEqual([
      '住所は500文字以内で入力してください',
    ])
    expect(
      messagesOf({ company_name: 'あ'.repeat(200), contact_person: 'あ'.repeat(100) }),
    ).toEqual([])
  })

  it('メールアドレスは形式を検証する。未入力は可', () => {
    expect(messagesOf({ email: 'abc' })).toEqual(['メールアドレスの形式が正しくありません'])
    expect(messagesOf({ email: 'sato@abc.co.jp' })).toEqual([])
    expect(messagesOf({ email: '' })).toEqual([])
  })
})

describe('toCustomerRequest', () => {
  it('前後の空白を除き、未入力の任意項目は null にする', () => {
    expect(
      toCustomerRequest({
        company_name: ' ABC商事 ',
        contact_person: ' ',
        phone: '03-1234-5678',
        email: '',
        address: '',
      }),
    ).toEqual({
      company_name: 'ABC商事',
      contact_person: null,
      phone: '03-1234-5678',
      email: null,
      address: null,
    })
  })
})

describe('toCustomerFormValues', () => {
  it('未設定（null）は空文字にする', () => {
    expect(
      toCustomerFormValues({
        company_name: 'ABC商事',
        contact_person: null,
        phone: null,
        email: 'a@b.co',
        address: null,
      }),
    ).toEqual({
      company_name: 'ABC商事',
      contact_person: '',
      phone: '',
      email: 'a@b.co',
      address: '',
    })
  })
})
