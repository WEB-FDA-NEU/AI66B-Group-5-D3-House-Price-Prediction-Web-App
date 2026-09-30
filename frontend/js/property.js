export const isLand = type => ['Đất nền', 'Thửa đất'].includes(type);

export function propertyFacts(input) {
  const fields = [
    ['Tỉnh/thành (2024)', input.city || 'Hồ Chí Minh'], ['Quận/huyện', input.district], ['Loại hình', input.property_type],
    ['Diện tích', `${input.area_m2} m²`],
  ];
  if (isLand(input.property_type)) {
    fields.push(['Mặt tiền', input.frontage_m != null ? `${input.frontage_m} m` : null],
      ['Đường tiếp cận', input.road_width_m != null ? `${input.road_width_m} m` : null],
      ['Mục đích sử dụng', input.land_use], ['Pháp lý khai báo', input.legal_status],
      ['Thông tin quy hoạch', input.planning_status || 'Chưa xác minh']);
    if (input.parcel_number) fields.push(['Số thửa (khai báo)', input.parcel_number]);
    if (input.map_sheet) fields.push(['Tờ bản đồ (khai báo)', input.map_sheet]);
  } else {
    fields.push(['Phòng ngủ', input.bedrooms], ['Phòng tắm', input.bathrooms], ['Số tầng', input.floors]);
    if (input.frontage_m != null) fields.push(['Mặt tiền', `${input.frontage_m} m`]);
    if (input.road_width_m != null) fields.push(['Đường tiếp cận', `${input.road_width_m} m`]);
  }
  if (input.source_listing_id) fields.push(['Nguồn lựa chọn', `Bản đồ demo · ${input.source_listing_id}`]);
  return fields;
}
