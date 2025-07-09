import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"

export function BreadCrumbGlobal() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
       
       
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Visa Expiry</BreadcrumbLink>
        </BreadcrumbItem>
      
      </BreadcrumbList>
    </Breadcrumb>
  )
}
