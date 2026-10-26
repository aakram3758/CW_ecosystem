-- Clouds Water Ecosystem — 07: starting reference data (editable afterwards from the dashboard)

insert into public.cities (code, name_ar, name_en, sort_order) values
  ('jed', 'جدة', 'Jeddah', 1),
  ('mak', 'مكة', 'Makkah', 2),
  ('ruh', 'الرياض', 'Riyadh', 3);

insert into public.districts (city_id, name_ar, name_en)
select c.id, v.ar, v.en
from (values
  ('jed', 'الصفا', 'Al Safa'), ('jed', 'السلامة', 'Al Salamah'), ('jed', 'الروضة', 'Al Rawdah'),
  ('jed', 'الحمراء', 'Al Hamra'), ('jed', 'المروة', 'Al Marwah'), ('jed', 'النسيم', 'Al Naseem'),
  ('mak', 'العزيزية', 'Al Aziziyah'), ('mak', 'الشوقية', 'Al Shawqiyah'), ('mak', 'الزاهر', 'Al Zahir'),
  ('ruh', 'الملقا', 'Al Malqa'), ('ruh', 'النرجس', 'Al Narjis'), ('ruh', 'العليا', 'Al Olaya'),
  ('ruh', 'السليمانية', 'Al Sulaimaniyah'), ('ruh', 'الياسمين', 'Al Yasmin')
) v(city, ar, en)
join public.cities c on c.code = v.city;

insert into public.chains (code, name_ar, name_en) values
  ('othaim', 'العثيم', 'Othaim'),
  ('panda', 'بنده', 'Panda'),
  ('almarai', 'المراعي', 'Almarai');

insert into public.materials (code, name_ar, name_en, color_light, color_dark, icon, sort_order) values
  ('card', 'كرتون', 'Cardboard', '#B5773A', '#D89A5B', 'box', 1),
  ('plas', 'بلاستيك', 'Plastic', '#1F6FB8', '#5C9BE0', 'bottle', 2),
  ('paper', 'ورق', 'Paper', '#2F8A5B', '#4FBF86', 'paper', 3),
  ('metal', 'معادن', 'Metal', '#5C6B7E', '#9AA9BC', 'hex', 4),
  ('bread', 'خبز', 'Bread', '#138A8A', '#3CC2C2', 'bread', 5);

insert into public.material_subtypes (material_id, code, name_ar, name_en)
select m.id, v.code, v.ar, v.en
from (values
  ('plas', 'mix', 'مكس', 'Mix'), ('plas', 'stretch', 'استرتش', 'Stretch'),
  ('metal', 'iron', 'حديد', 'Iron'), ('metal', 'aluminium', 'ألومنيوم', 'Aluminium'), ('metal', 'copper', 'نحاس', 'Copper')
) v(material, code, ar, en)
join public.materials m on m.code = v.material;

insert into public.reasons (kind, label_ar, label_en, sort_order) values
  ('cancel', 'الفرع طلب الإلغاء هاتفيًا', 'Branch asked to cancel by phone', 1),
  ('cancel', 'طلب مكرر', 'Duplicate request', 2),
  ('cancel', 'الكمية غير جاهزة', 'Quantity not ready', 3),
  ('cancel', 'الفرع سلّم المادة لجهة أخرى', 'Branch gave the material to another party', 4),
  ('close', 'الفرع لا يملك مادة بشكل متكرر', 'Branch repeatedly has no material', 1),
  ('close', 'طلب مكرر', 'Duplicate request', 2),
  ('close', 'الكمية المتبقية صغيرة جدًا', 'Remaining quantity is too small', 3),
  ('close', 'الفرع طلب الإلغاء هاتفيًا', 'Branch asked to cancel by phone', 4),
  ('close', 'الموقع غير صالح للوصول', 'Location cannot be reached', 5),
  ('failed', 'الفرع مغلق', 'Branch was closed', 1),
  ('failed', 'لا توجد مادة', 'No material available', 2),
  ('failed', 'المسؤول غير متواجد', 'Contact person not available', 3),
  ('failed', 'تعذّر الوصول للموقع', 'Could not reach the location', 4),
  ('partial', 'الكمية أقل من المذكور', 'Less than the stated quantity', 1),
  ('partial', 'السيارة امتلأت', 'Truck was full', 2),
  ('partial', 'جزء من المادة غير صالح', 'Part of the material was unusable', 3);
