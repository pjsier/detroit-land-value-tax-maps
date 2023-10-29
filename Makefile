S3_BUCKET = detroit-land-value-tax-maps
S3_REGION = us-east-1

all: output/parcels.pmtiles

.PHONY: deploy
deploy:
	s3cmd sync ./dist/ s3://$(S3_BUCKET)/ \
	--region=$(S3_REGION) \
	--host=$(S3_REGION).linodeobjects.com \
	--host-bucket="%(bucket)s.$(S3_REGION).linodeobjects.com" \
	--progress \
	--no-preserve \
	--acl-public \
	--no-mime-magic \
	--guess-mime-type \
	--add-header 'Cache-Control: "public, max-age=0, must-revalidate"'

.PHONY: deploy-data
deploy-data:
	s3cmd sync ./output/ s3://$(S3_BUCKET)/data/ \
	--region=$(S3_REGION) \
	--host=$(S3_REGION).linodeobjects.com \
	--host-bucket="%(bucket)s.$(S3_REGION).linodeobjects.com" \
	--progress \
	--no-preserve \
	--acl-public \
	--no-mime-magic \
	--guess-mime-type \
	--add-header 'Cache-Control: "public, max-age=0, must-revalidate"'

output/parcels.pmtiles: output/parcels.mbtiles
	pmtiles convert $< $@

output/parcels.mbtiles: output/parcels.geojson
	tippecanoe \
	--simplification=10 \
	--simplify-only-low-zooms \
	--minimum-zoom=11 \
	--maximum-zoom=16 \
	--no-tile-stats \
	--detect-shared-borders \
	--grid-low-zooms \
	--coalesce-smallest-as-needed \
	--accumulate-attribute=pct_change:mean \
	--attribute-type=parcel_num:string \
	--use-attribute-for-id=id \
	--force \
	-L parcels:$< -o $@

.PRECIOUS: output/parcels.geojson
output/parcels.geojson: input/parcels.geojson output/detroit-lvt.csv
	node --max_old_space_size=8192 $$(which mapshaper) -i $< \
	-join $(filter-out $<,$^) field-types=parcel_num:str keys=parcel_num,parcel_num \
	-filter 'bill !== null && bill > 0' \
	-rename-fields id=ObjectId,taxpayer=taxpayer_1,assessed_value=a_tv \
	-each 'pct_change = +((final_change_c / bill) * 100).toFixed(1)' \
	-filter-fields id,parcel_num,address,taxpayer_city,taxpayer_state,assessed_value,bill,final_change_c,final_lvt_bill_nez_c,post_nez_bill_c,pct_change \
	-o $@

.PRECIOUS: output/detroit-lvt.csv
output/detroit-lvt.csv: input/detroit-lvt.geojson
	mapshaper -i $< -rename-fields parcel_num=pnum -o $@

input/detroit-lvt.geojson:
	esri2geojson https://services2.arcgis.com/qvkbeam7Wirps6zC/ArcGIS/rest/services/lvt_public_20231025/FeatureServer/0 $@

input/parcels.geojson: input/raw-parcels.geojson
	node --max_old_space_size=8192 $$(which mapshaper) -i $< \
	-filter '!!parcel_number' \
	-rename-fields parcel_num=parcel_number \
	-dissolve2 parcel_num copy-fields=ward,address,council_district,zip_code,taxpayer_1,taxpayer_2,taxpayer_street,taxpayer_city,taxpayer_state,taxpayer_zip,property_class,property_class_desc \
	-clean \
	-o $@

input/raw-parcels.geojson:
	wget -qO $@ 'https://opendata.arcgis.com/api/v3/datasets/9ca25373d4f747be85850344186dda3c_0/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1'
