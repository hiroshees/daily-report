import { CustomerCreateRequestSchema } from '@/schemas/customer'
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

describe('API のスキーマとの整合', () => {
  // フォームだけ有効で API が拒否する、またはその逆にならないよう、上限ちょうどと +1 で比べる
  const edge = (length: number) => ({
    company_name: 'あ'.repeat(length),
    contact_person: 'あ'.repeat(length),
    phone: '1'.repeat(length),
    email: 'a'.repeat(length - 8) + '@abc.com',
    address: 'あ'.repeat(length),
  })

  it.each([
    ['会社名', 'company_name', 200],
    ['担当者名', 'contact_person', 100],
    ['電話番号', 'phone', 30],
    ['メールアドレス', 'email', 255],
    ['住所', 'address', 500],
  ] as const)('%s の上限（%i 文字）はフォームと API で一致する', (_label, key, max) => {
    const base = { ...EMPTY_CUSTOMER, company_name: '会社' }
    const at = (length: number) => ({ ...base, [key]: edge(length)[key] })

    for (const length of [max, max + 1]) {
      const formOk = CustomerFormSchema.safeParse(at(length)).success
      const apiOk = CustomerCreateRequestSchema.safeParse(toCustomerRequest(at(length))).success
      expect(formOk).toBe(apiOk)
    }
  })
})
