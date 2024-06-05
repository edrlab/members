# EDRLab's members' website

This EDRLab's members' online directory aims to help with mutual identification and collaboration. 

Each organization has a dedicated page where they can showcase their activities and promote their services.

## Member card
Each member card is composed of the following information in YAML format: 
* `title`: the name of the organization, displayed as a title
* `member_url`: URL of the organization's website
* `geographies`: countries where the organization acts. Two letter codes are expected, the global mentions "Worldwide", "Africa", "America", "Asia", "Europe" and "Oceania" are also accepted. *This value is not displayed, we may use it later*
* `based`: countries where the organization's headquarters is based. *This value is not displayed and used only to count the number of countries.*
* `ig`: interest group within the EDRlab collaboration group. For now two values are possible: "LCP" and "Accessibility".
* `crossroads`: other membership organizations or signatory engagements that are common to different members. Values for now are: ["Sustainable Development Goals", "Divina", "Readium", "Daisy Consortium"] 
* `services`: a list of services provided by your organization
* `tags`: ["Accessibility", "DAISY"]
* `categories`: one or more edrlab's membership categories. Available values are: ["NGOs", "Libraries", "Serving persons with print disabilities", "Publishers and publishing groups", "Technology providers", "Content portals", "Providers of publishing services", "Academic", "Booksellers", "Ebook distributors", "Libraries", "Membership organizations", "Officio members"]
* `summary`: "A short description of the organization. Around 100 words is a good balance."
* `press`: if a press release or an online article announces or emphasizes your organization's EDRLab membership, the URL can be added here.
* `date`: when did the edrlab membership started? This field is used to sort cards (last members first)
* `featureImage`: a URL to your organization logo. Please consider that the edrlab's members website has a white background.

Additionally to thise YAML information, each member can provide a markdown or HTML content that will be displayed 


