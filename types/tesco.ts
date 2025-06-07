export interface Image {
  type: string
  url: string
  region: string
  title: string
}

export interface TaxonomyItemImageStyle {
  style: string
  images: Image[]
}

export interface TaxonomyItem {
  id: string
  name: string
  label: string
  pageType: string
  images: TaxonomyItemImageStyle[]
  children?: TaxonomyItem[]
}

export interface GetTaxonomyResponse {
  taxonomy: TaxonomyItem[]
}

export interface ProductImage {
  url: string
  originalUrl: string
}

export interface ProductDisplayImages {
  default: ProductImage
}

export interface ProductImages {
  display: ProductDisplayImages
  default: ProductImage
}

export interface ProductPrice {
  price: number
  unitPrice: number
  unitOfMeasure: string
}

export interface ProductItem {
  id: string
  baseProductId: string
  title: string
  brandName: string
  shortDescription: string
  defaultImageUrl?: string
  images?: ProductImages
  price: ProductPrice
  superDepartmentId: string
  superDepartmentName: string
  departmentId: string
  departmentName: string
  aisleId: string
  aisleName: string
  shelfId: string
  shelfName: string
}

export interface PageInformation {
  totalCount: number
  pageNo: number
  count: number
  pageSize: number
  offset: number
}

export interface GetCategoryProductsResponse {
  category: {
    pageInformation: PageInformation
    productItems: ProductItem[]
  }
}
