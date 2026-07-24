# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: architecture-workflows.spec.ts >> Architecture workflows >> persists service-level swimlane workflows and protects against accidental exit
- Location: tests/architecture-workflows.spec.ts:133:3

# Error details

```
Error: Ambiguous button /^Logic$/: found 3 visible, enabled matches
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - link "SYSGRID" [ref=e6] [cursor=pointer]:
        - /url: /
        - img [ref=e8]
        - generic [ref=e10]: SYSGRID
      - button [ref=e11] [cursor=pointer]:
        - img [ref=e12]
    - navigation [ref=e13]:
      - generic [ref=e14]:
        - button "OPERATIONS" [ref=e15] [cursor=pointer]:
          - generic [ref=e16]: OPERATIONS
          - img [ref=e17]
        - generic [ref=e20]:
          - link "Home" [ref=e21] [cursor=pointer]:
            - /url: /
            - generic [ref=e22]:
              - img [ref=e23]
              - generic [ref=e28]: Home
          - link "Projects" [ref=e29] [cursor=pointer]:
            - /url: /projects
            - generic [ref=e30]:
              - img [ref=e31]
              - generic [ref=e34]: Projects
          - link "Monitoring" [ref=e35] [cursor=pointer]:
            - /url: /monitoring
            - generic [ref=e36]:
              - img [ref=e37]
              - generic [ref=e39]: Monitoring
      - generic [ref=e40]:
        - button "INFRASTRUCTURE" [ref=e41] [cursor=pointer]:
          - generic [ref=e42]: INFRASTRUCTURE
          - img [ref=e43]
        - generic [ref=e46]:
          - link "Assets" [ref=e47] [cursor=pointer]:
            - /url: /asset
            - generic [ref=e48]:
              - img [ref=e49]
              - generic [ref=e52]: Assets
          - link "Racks" [ref=e53] [cursor=pointer]:
            - /url: /racks
            - generic [ref=e54]:
              - img [ref=e55]
              - generic [ref=e59]: Racks
          - link "Services" [ref=e60] [cursor=pointer]:
            - /url: /services
            - generic [ref=e61]:
              - img [ref=e62]
              - generic [ref=e66]: Services
          - link "External" [ref=e67] [cursor=pointer]:
            - /url: /external
            - generic [ref=e68]:
              - img [ref=e69]
              - generic [ref=e75]: External
      - generic [ref=e76]:
        - button "CONNECTIVITY" [ref=e77] [cursor=pointer]:
          - generic [ref=e78]: CONNECTIVITY
          - img [ref=e79]
        - generic [ref=e82]:
          - link "Network" [ref=e83] [cursor=pointer]:
            - /url: /network
            - generic [ref=e84]:
              - img [ref=e85]
              - generic [ref=e90]: Network
          - link "Architecture" [ref=e91] [cursor=pointer]:
            - /url: /architecture
            - generic [ref=e92]:
              - img [ref=e93]
              - generic [ref=e97]: Architecture
      - generic [ref=e99]:
        - button "ANALYSIS" [ref=e100] [cursor=pointer]:
          - generic [ref=e101]: ANALYSIS
          - img [ref=e102]
        - generic [ref=e105]:
          - link "FAR" [ref=e106] [cursor=pointer]:
            - /url: /far
            - generic [ref=e107]:
              - img [ref=e108]
              - generic [ref=e110]: FAR
          - link "Research" [ref=e111] [cursor=pointer]:
            - /url: /research
            - generic [ref=e112]:
              - img [ref=e113]
              - generic [ref=e116]: Research
      - generic [ref=e117]:
        - button "RESOURCES" [ref=e118] [cursor=pointer]:
          - generic [ref=e119]: RESOURCES
          - img [ref=e120]
        - generic [ref=e123]:
          - link "Vendors" [ref=e124] [cursor=pointer]:
            - /url: /vendors
            - generic [ref=e125]:
              - img [ref=e126]
              - generic [ref=e129]: Vendors
          - link "Knowledge" [ref=e130] [cursor=pointer]:
            - /url: /knowledge
            - generic [ref=e131]:
              - img [ref=e132]
              - generic [ref=e135]: Knowledge
    - generic [ref=e136]:
      - 'button "Haewon Kim ID: 1" [ref=e137] [cursor=pointer]':
        - img [ref=e139]
        - generic [ref=e142]:
          - generic [ref=e143]: Haewon Kim
          - generic [ref=e144]: "ID: 1"
      - generic [ref=e145]:
        - button "Dark" [ref=e146] [cursor=pointer]:
          - generic [ref=e148]: Dark
        - button "Light" [ref=e149] [cursor=pointer]:
          - generic [ref=e151]: Light
    - paragraph [ref=e153]: 1.2.6
  - main [ref=e154]:
    - generic [ref=e156]:
      - generic [ref=e157]:
        - button "Patch Notes" [ref=e158] [cursor=pointer]
        - button "Search assets, projects, or incidents... ⌘ K" [ref=e159] [cursor=pointer]:
          - img [ref=e160]
          - generic [ref=e163]: Search assets, projects, or incidents...
          - generic [ref=e164]:
            - generic [ref=e165]: ⌘
            - generic [ref=e166]: K
      - generic [ref=e167]:
        - button "Active Database Local Demo" [ref=e169] [cursor=pointer]:
          - img [ref=e171]
          - generic [ref=e175]:
            - generic [ref=e176]: Active Database
            - generic [ref=e177]: Local Demo
          - img [ref=e178]
        - generic [ref=e180]:
          - generic [ref=e181]: System Status
          - generic [ref=e182]:
            - generic [ref=e183]: Operational
            - generic [ref=e184]: 46ms
        - button "Notifications" [ref=e185] [cursor=pointer]:
          - img [ref=e186]
        - button [ref=e190] [cursor=pointer]:
          - img [ref=e191]
        - link [ref=e200] [cursor=pointer]:
          - /url: /settings
          - img [ref=e201]
    - generic [ref=e205]:
      - generic [ref=e206]:
        - generic [ref=e207]:
          - generic [ref=e208]: PW-ARCH-SVC-1784873451699-gk6nir
          - generic [ref=e209]: Service
        - generic [ref=e211]:
          - button "Arch Info" [ref=e212] [cursor=pointer]:
            - img
            - generic [ref=e214]: Arch Info
          - button "History" [ref=e215] [cursor=pointer]:
            - img
            - generic [ref=e219]: History
          - button "Approve" [ref=e220] [cursor=pointer]:
            - img
            - generic [ref=e223]: Approve
          - button "Auto Layout" [ref=e224] [cursor=pointer]:
            - img [ref=e225]
          - button "Impact Mode" [ref=e229] [cursor=pointer]:
            - img [ref=e230]
          - button "Operational Overlay" [ref=e232] [cursor=pointer]:
            - img [ref=e233]
          - combobox [ref=e236]:
            - option "All" [selected]
            - option "Critical Path"
            - option "Production"
            - option "Attention"
          - button "Report Mode" [ref=e237] [cursor=pointer]:
            - img [ref=e238]
          - button "Presentation Mode" [ref=e242] [cursor=pointer]:
            - img [ref=e243]
          - button "Back" [ref=e246] [cursor=pointer]:
            - img
            - generic [ref=e248]: Back
      - generic:
        - generic:
          - generic:
            - paragraph: Owner
            - paragraph: Payments Engineering
          - generic:
            - paragraph: Criticality
            - paragraph: Critical
          - generic:
            - paragraph: Review
            - paragraph: Approved
          - generic:
            - paragraph: Scenario
            - paragraph: ALL
          - generic:
            - paragraph: Topology
            - paragraph: 2 Nodes / 1 Flows
          - generic:
            - paragraph: Attention
            - paragraph: Review overdue
      - generic [ref=e249]:
        - generic [ref=e250]:
          - heading "Inventory" [level=2] [ref=e251]:
            - img [ref=e252]
            - text: Inventory
          - generic [ref=e255]:
            - button [ref=e256] [cursor=pointer]:
              - img [ref=e257]
            - button [ref=e262] [cursor=pointer]:
              - img [ref=e263]
        - generic [ref=e266]:
          - generic [ref=e267]:
            - button "Internal" [ref=e268] [cursor=pointer]
            - button "External" [ref=e269] [cursor=pointer]
          - generic [ref=e270]:
            - img [ref=e271]
            - textbox "Search..." [ref=e274]
          - combobox [ref=e275]:
            - option "All Systems" [selected]
            - option "BI-ANALYTICS"
            - option "ERP"
            - option "FINANCE"
            - option "K8S-CLUSTER"
            - option "MANUFACTURING"
            - option "MES"
            - option "PW-CRUD-NET-1784855310748-0dusea"
            - option "PW-CRUD-SYS-1784855310600-4s9lz4"
            - option "PW-EXT-SYS-1784855320654-s0oj71"
            - option "PW-G-SYS-1784855439998-xxff69"
            - option "PW-MAN-SYS-1784855432591-uv4zzx"
            - option "PW-NET-SYS-1784855426565-02aeka"
            - option "PW-RACK-SYS-1784855544379-zswlze"
            - option "PW-SVC-SYS-1784855760002-8km4gc"
            - option "PW-SYS-1784762998114-rw2mee"
            - option "PW-SYS-1784763008891-zmv5t8"
            - option "PW-SYS-1784763012272-hb2gw4"
            - option "PW-SYS-1784763014859-ydrxbo"
            - option "PW-SYS-1784763018303-dnxa3q"
            - option "PW-SYS-1784777690668-pypxyk"
            - option "PW-SYS-1784777694209-48mrna"
            - option "PW-SYS-1784777697329-s22s1g"
            - option "PW-SYS-1784777701442-omfqg2"
            - option "PW-SYS-1784777728685-rzms3f"
            - option "PW-SYS-1784777732499-fxj7e3"
            - option "PW-SYS-1784777735815-mbwo65"
            - option "PW-SYS-1784777739336-x3xxbk"
            - option "PW-SYS-1784818323483-sq99o5"
            - option "PW-SYS-1784818326845-o42fg2"
            - option "PW-SYS-1784818329741-4uom3a"
            - option "PW-SYS-1784818333446-usaetz"
            - option "PW-SYS-1784840334132-jglhh3"
            - option "PW-SYS-1784840867852-d8s4yr"
            - option "PW-SYS-1784840871107-8lci1x"
            - option "PW-SYS-1784840873850-845nds"
            - option "PW-SYS-1784840877241-tszo97"
            - option "PW-SYS-1784841428613-d23gqx"
            - option "PW-SYS-1784841432257-rwe27l"
            - option "PW-SYS-1784841435023-akax6n"
            - option "PW-SYS-1784841438548-l730cr"
            - option "PW-SYS-1784841752541-tnkc7b"
            - option "PW-SYS-1784842069012-5v0dd8"
            - option "PW-SYS-1784842163761-kaczna"
            - option "PW-SYS-1784842166703-4nor8q"
            - option "PW-SYS-1784842169547-dc2vjz"
            - option "PW-SYS-1784842173059-ys612r"
            - option "PW-SYS-1784854171717-qn6n82"
            - option "PW-SYS-1784854179412-e7wuvi"
            - option "PW-SYS-1784854181723-o6l2mr"
            - option "PW-SYS-1784854362808-0me10n"
            - option "PW-SYS-1784854423830-fqgyjk"
            - option "PW-SYS-1784854666609-05azt1"
            - option "PW-SYS-1784854848738-b2domo"
            - option "PW-SYS-1784855031013-fhmots"
            - option "PW-SYS-1784855273712-9yo66t"
            - option "PW-SYS-1784855326784-xkoovv"
            - option "PW-SYS-1784855328663-ff12fw"
            - option "PW-SYS-1784855331755-afq7qk"
            - option "PW-SYS-1784855334961-4m9pom"
            - option "PW-SYS-1784855408674-jc2ley"
            - option "PW-SYS-1784855412314-vrryvv"
            - option "PW-SYS-1784855415675-xsb0kx"
            - option "PW-SYS-1784855419744-na6c3g"
            - option "PW-SYS-1784855423835-yxouyr"
            - option "PW-SYS-1784855447796-mzaiqh"
            - option "PW-SYS-1784855549919-pcm4od"
            - option "PW-SYS-1784855552254-68zn5p"
            - option "PW-SYS-1784855785124-8o3qft"
            - option "PW-SYS-1784855789382-edhndf"
            - option "PW-SYS-1784856111374-sa7wyz"
            - option "PW-SYS-1784856115539-ysyv7y"
            - option "PW-SYS-1784856119086-e0oj5e"
            - option "PW-SYS-1784857125178-56mmmp"
            - option "PW-SYS-1784857128669-thvsnn"
            - option "PW-SYS-1784873362183-bdy4ff"
            - option "PW-SYS-1784873443895-fxyoe4"
            - option "PW-SYS-1784873451490-nlz1ug"
            - option "SCADA"
            - option "SECURITY"
        - generic [ref=e277]:
          - generic [ref=e278]:
            - heading "Internal Assets" [level=3] [ref=e279]
            - generic [ref=e280]: "402"
          - generic [ref=e281]:
            - button "FINANCE-S-001 0 Services" [ref=e282] [cursor=pointer]:
              - generic [ref=e283]:
                - generic [ref=e284]: FINANCE-S-001
                - generic [ref=e286]: 0 Services
              - img [ref=e287]
            - button "MANUFACTURING-S-002 1 Service" [ref=e288] [cursor=pointer]:
              - generic [ref=e289]:
                - generic [ref=e290]: MANUFACTURING-S-002
                - generic [ref=e292]: 1 Service
              - img [ref=e293]
            - button "BI-ANALYTICS-P-003 3 Services" [ref=e294] [cursor=pointer]:
              - generic [ref=e295]:
                - generic [ref=e296]: BI-ANALYTICS-P-003
                - generic [ref=e298]: 3 Services
              - img [ref=e299]
            - button "MANUFACTURING-P-004 3 Services" [ref=e300] [cursor=pointer]:
              - generic [ref=e301]:
                - generic [ref=e302]: MANUFACTURING-P-004
                - generic [ref=e304]: 3 Services
              - img [ref=e305]
            - button "MANUFACTURING-P-005 3 Services" [ref=e306] [cursor=pointer]:
              - generic [ref=e307]:
                - generic [ref=e308]: MANUFACTURING-P-005
                - generic [ref=e310]: 3 Services
              - img [ref=e311]
            - button "MANUFACTURING-P-006 2 Services" [ref=e312] [cursor=pointer]:
              - generic [ref=e313]:
                - generic [ref=e314]: MANUFACTURING-P-006
                - generic [ref=e316]: 2 Services
              - img [ref=e317]
            - button "MES-P-007 2 Services" [ref=e318] [cursor=pointer]:
              - generic [ref=e319]:
                - generic [ref=e320]: MES-P-007
                - generic [ref=e322]: 2 Services
              - img [ref=e323]
            - button "SECURITY-P-008 2 Services" [ref=e324] [cursor=pointer]:
              - generic [ref=e325]:
                - generic [ref=e326]: SECURITY-P-008
                - generic [ref=e328]: 2 Services
              - img [ref=e329]
            - button "SECURITY-P-009 2 Services" [ref=e330] [cursor=pointer]:
              - generic [ref=e331]:
                - generic [ref=e332]: SECURITY-P-009
                - generic [ref=e334]: 2 Services
              - img [ref=e335]
            - button "MES-P-010 2 Services" [ref=e336] [cursor=pointer]:
              - generic [ref=e337]:
                - generic [ref=e338]: MES-P-010
                - generic [ref=e340]: 2 Services
              - img [ref=e341]
            - button "ERP-P-011 2 Services" [ref=e342] [cursor=pointer]:
              - generic [ref=e343]:
                - generic [ref=e344]: ERP-P-011
                - generic [ref=e346]: 2 Services
              - img [ref=e347]
            - button "MES-P-012 2 Services" [ref=e348] [cursor=pointer]:
              - generic [ref=e349]:
                - generic [ref=e350]: MES-P-012
                - generic [ref=e352]: 2 Services
              - img [ref=e353]
            - button "MANUFACTURING-P-013 2 Services" [ref=e354] [cursor=pointer]:
              - generic [ref=e355]:
                - generic [ref=e356]: MANUFACTURING-P-013
                - generic [ref=e358]: 2 Services
              - img [ref=e359]
            - button "MES-P-014 2 Services" [ref=e360] [cursor=pointer]:
              - generic [ref=e361]:
                - generic [ref=e362]: MES-P-014
                - generic [ref=e364]: 2 Services
              - img [ref=e365]
            - button "FINANCE-P-015 2 Services" [ref=e366] [cursor=pointer]:
              - generic [ref=e367]:
                - generic [ref=e368]: FINANCE-P-015
                - generic [ref=e370]: 2 Services
              - img [ref=e371]
            - button "BI-ANALYTICS-P-016 2 Services" [ref=e372] [cursor=pointer]:
              - generic [ref=e373]:
                - generic [ref=e374]: BI-ANALYTICS-P-016
                - generic [ref=e376]: 2 Services
              - img [ref=e377]
            - button "MANUFACTURING-P-017 2 Services" [ref=e378] [cursor=pointer]:
              - generic [ref=e379]:
                - generic [ref=e380]: MANUFACTURING-P-017
                - generic [ref=e382]: 2 Services
              - img [ref=e383]
            - button "MANUFACTURING-P-018 2 Services" [ref=e384] [cursor=pointer]:
              - generic [ref=e385]:
                - generic [ref=e386]: MANUFACTURING-P-018
                - generic [ref=e388]: 2 Services
              - img [ref=e389]
            - button "MES-P-019 2 Services" [ref=e390] [cursor=pointer]:
              - generic [ref=e391]:
                - generic [ref=e392]: MES-P-019
                - generic [ref=e394]: 2 Services
              - img [ref=e395]
            - button "FINANCE-P-020 2 Services" [ref=e396] [cursor=pointer]:
              - generic [ref=e397]:
                - generic [ref=e398]: FINANCE-P-020
                - generic [ref=e400]: 2 Services
              - img [ref=e401]
            - button "FINANCE-P-021 2 Services" [ref=e402] [cursor=pointer]:
              - generic [ref=e403]:
                - generic [ref=e404]: FINANCE-P-021
                - generic [ref=e406]: 2 Services
              - img [ref=e407]
            - button "MES-P-022 2 Services" [ref=e408] [cursor=pointer]:
              - generic [ref=e409]:
                - generic [ref=e410]: MES-P-022
                - generic [ref=e412]: 2 Services
              - img [ref=e413]
            - button "MANUFACTURING-S-023 0 Services" [ref=e414] [cursor=pointer]:
              - generic [ref=e415]:
                - generic [ref=e416]: MANUFACTURING-S-023
                - generic [ref=e418]: 0 Services
              - img [ref=e419]
            - button "BI-ANALYTICS-S-024 0 Services" [ref=e420] [cursor=pointer]:
              - generic [ref=e421]:
                - generic [ref=e422]: BI-ANALYTICS-S-024
                - generic [ref=e424]: 0 Services
              - img [ref=e425]
            - button "BI-ANALYTICS-P-025 2 Services" [ref=e426] [cursor=pointer]:
              - generic [ref=e427]:
                - generic [ref=e428]: BI-ANALYTICS-P-025
                - generic [ref=e430]: 2 Services
              - img [ref=e431]
            - button "ERP-P-026 2 Services" [ref=e432] [cursor=pointer]:
              - generic [ref=e433]:
                - generic [ref=e434]: ERP-P-026
                - generic [ref=e436]: 2 Services
              - img [ref=e437]
            - button "SCADA-P-027 2 Services" [ref=e438] [cursor=pointer]:
              - generic [ref=e439]:
                - generic [ref=e440]: SCADA-P-027
                - generic [ref=e442]: 2 Services
              - img [ref=e443]
            - button "SECURITY-P-028 2 Services" [ref=e444] [cursor=pointer]:
              - generic [ref=e445]:
                - generic [ref=e446]: SECURITY-P-028
                - generic [ref=e448]: 2 Services
              - img [ref=e449]
            - button "MANUFACTURING-P-029 2 Services" [ref=e450] [cursor=pointer]:
              - generic [ref=e451]:
                - generic [ref=e452]: MANUFACTURING-P-029
                - generic [ref=e454]: 2 Services
              - img [ref=e455]
            - button "MES-P-030 2 Services" [ref=e456] [cursor=pointer]:
              - generic [ref=e457]:
                - generic [ref=e458]: MES-P-030
                - generic [ref=e460]: 2 Services
              - img [ref=e461]
            - button "ERP-P-031 2 Services" [ref=e462] [cursor=pointer]:
              - generic [ref=e463]:
                - generic [ref=e464]: ERP-P-031
                - generic [ref=e466]: 2 Services
              - img [ref=e467]
            - button "SCADA-P-032 2 Services" [ref=e468] [cursor=pointer]:
              - generic [ref=e469]:
                - generic [ref=e470]: SCADA-P-032
                - generic [ref=e472]: 2 Services
              - img [ref=e473]
            - button "MANUFACTURING-P-033 2 Services" [ref=e474] [cursor=pointer]:
              - generic [ref=e475]:
                - generic [ref=e476]: MANUFACTURING-P-033
                - generic [ref=e478]: 2 Services
              - img [ref=e479]
            - button "MANUFACTURING-P-034 2 Services" [ref=e480] [cursor=pointer]:
              - generic [ref=e481]:
                - generic [ref=e482]: MANUFACTURING-P-034
                - generic [ref=e484]: 2 Services
              - img [ref=e485]
            - button "SCADA-P-035 2 Services" [ref=e486] [cursor=pointer]:
              - generic [ref=e487]:
                - generic [ref=e488]: SCADA-P-035
                - generic [ref=e490]: 2 Services
              - img [ref=e491]
            - button "MES-P-036 2 Services" [ref=e492] [cursor=pointer]:
              - generic [ref=e493]:
                - generic [ref=e494]: MES-P-036
                - generic [ref=e496]: 2 Services
              - img [ref=e497]
            - button "MANUFACTURING-P-037 2 Services" [ref=e498] [cursor=pointer]:
              - generic [ref=e499]:
                - generic [ref=e500]: MANUFACTURING-P-037
                - generic [ref=e502]: 2 Services
              - img [ref=e503]
            - button "BI-ANALYTICS-P-038 2 Services" [ref=e504] [cursor=pointer]:
              - generic [ref=e505]:
                - generic [ref=e506]: BI-ANALYTICS-P-038
                - generic [ref=e508]: 2 Services
              - img [ref=e509]
            - button "MANUFACTURING-P-039 2 Services" [ref=e510] [cursor=pointer]:
              - generic [ref=e511]:
                - generic [ref=e512]: MANUFACTURING-P-039
                - generic [ref=e514]: 2 Services
              - img [ref=e515]
            - button "BI-ANALYTICS-P-040 2 Services" [ref=e516] [cursor=pointer]:
              - generic [ref=e517]:
                - generic [ref=e518]: BI-ANALYTICS-P-040
                - generic [ref=e520]: 2 Services
              - img [ref=e521]
            - button "FINANCE-S-041 0 Services" [ref=e522] [cursor=pointer]:
              - generic [ref=e523]:
                - generic [ref=e524]: FINANCE-S-041
                - generic [ref=e526]: 0 Services
              - img [ref=e527]
            - button "FINANCE-S-042 0 Services" [ref=e528] [cursor=pointer]:
              - generic [ref=e529]:
                - generic [ref=e530]: FINANCE-S-042
                - generic [ref=e532]: 0 Services
              - img [ref=e533]
            - button "MANUFACTURING-P-043 2 Services" [ref=e534] [cursor=pointer]:
              - generic [ref=e535]:
                - generic [ref=e536]: MANUFACTURING-P-043
                - generic [ref=e538]: 2 Services
              - img [ref=e539]
            - button "SECURITY-P-044 2 Services" [ref=e540] [cursor=pointer]:
              - generic [ref=e541]:
                - generic [ref=e542]: SECURITY-P-044
                - generic [ref=e544]: 2 Services
              - img [ref=e545]
            - button "K8S-CLUSTER-P-045 2 Services" [ref=e546] [cursor=pointer]:
              - generic [ref=e547]:
                - generic [ref=e548]: K8S-CLUSTER-P-045
                - generic [ref=e550]: 2 Services
              - img [ref=e551]
            - button "SCADA-P-046 2 Services" [ref=e552] [cursor=pointer]:
              - generic [ref=e553]:
                - generic [ref=e554]: SCADA-P-046
                - generic [ref=e556]: 2 Services
              - img [ref=e557]
            - button "SCADA-P-047 2 Services" [ref=e558] [cursor=pointer]:
              - generic [ref=e559]:
                - generic [ref=e560]: SCADA-P-047
                - generic [ref=e562]: 2 Services
              - img [ref=e563]
            - button "FINANCE-P-048 2 Services" [ref=e564] [cursor=pointer]:
              - generic [ref=e565]:
                - generic [ref=e566]: FINANCE-P-048
                - generic [ref=e568]: 2 Services
              - img [ref=e569]
            - button "K8S-CLUSTER-P-049 2 Services" [ref=e570] [cursor=pointer]:
              - generic [ref=e571]:
                - generic [ref=e572]: K8S-CLUSTER-P-049
                - generic [ref=e574]: 2 Services
              - img [ref=e575]
            - button "MES-P-050 2 Services" [ref=e576] [cursor=pointer]:
              - generic [ref=e577]:
                - generic [ref=e578]: MES-P-050
                - generic [ref=e580]: 2 Services
              - img [ref=e581]
        - button "Commit Changes" [disabled] [ref=e583]:
          - img [ref=e584]
          - generic [ref=e588]: Commit Changes
      - generic [ref=e589]:
        - generic:
          - generic: Ingress
          - generic: Core Services
          - generic: External
          - generic: Operations Overlay
        - generic [ref=e590]:
          - generic [ref=e592]:
            - generic:
              - img:
                - generic:
                  - button "Edge from device-402 to device-403"
              - button "SYNC_PATH" [ref=e594] [cursor=pointer]:
                - generic [ref=e596]: SYNC_PATH
              - generic:
                - button "1 Maintenance 1 Monitor PW-ASSET-A-1784873451490-nlz1ug 10.0.90.10 Structure PW-SYS-1784873451490-nlz1ug Attached Surfaces 0 mapped Unidentified Interface" [ref=e597] [cursor=pointer]:
                  - generic [ref=e598]:
                    - generic [ref=e600]:
                      - generic [ref=e601]: 1 Maintenance
                      - generic [ref=e602]: 1 Monitor
                    - generic [ref=e603]:
                      - generic [ref=e604]:
                        - img [ref=e606]
                        - generic [ref=e609]:
                          - paragraph [ref=e610]: PW-ASSET-A-1784873451490-nlz1ug
                          - paragraph [ref=e611]: 10.0.90.10
                      - generic [ref=e612]:
                        - paragraph [ref=e613]: Structure
                        - paragraph [ref=e614]: PW-SYS-1784873451490-nlz1ug
                    - generic [ref=e615]:
                      - generic [ref=e616]:
                        - paragraph [ref=e617]: Attached Surfaces
                        - paragraph [ref=e618]: 0 mapped
                      - generic [ref=e622]:
                        - img [ref=e623]
                        - generic [ref=e626]: Unidentified Interface
                - button "PW-ASSET-B-1784873451490-nlz1ug 10.0.90.12 Structure PW-SYS-1784873451490-nlz1ug Attached Surfaces 0 mapped Unidentified Interface" [ref=e628] [cursor=pointer]:
                  - generic [ref=e629]:
                    - generic [ref=e631]:
                      - generic [ref=e632]:
                        - img [ref=e634]
                        - generic [ref=e637]:
                          - paragraph [ref=e638]: PW-ASSET-B-1784873451490-nlz1ug
                          - paragraph [ref=e639]: 10.0.90.12
                      - generic [ref=e640]:
                        - paragraph [ref=e641]: Structure
                        - paragraph [ref=e642]: PW-SYS-1784873451490-nlz1ug
                    - generic [ref=e643]:
                      - generic [ref=e644]:
                        - paragraph [ref=e645]: Attached Surfaces
                        - paragraph [ref=e646]: 0 mapped
                      - generic [ref=e650]:
                        - img [ref=e651]
                        - generic [ref=e654]: Unidentified Interface
          - img [ref=e656]
          - link "React Flow attribution" [ref=e659] [cursor=pointer]:
            - /url: https://reactflow.dev
            - text: React Flow
      - generic [ref=e662]:
        - generic [ref=e663]:
          - heading "Configuration" [level=2] [ref=e664]:
            - img [ref=e665]
            - text: Configuration
          - button [ref=e667] [cursor=pointer]:
            - img [ref=e668]
        - generic [ref=e671]:
          - generic [ref=e672]:
            - paragraph [ref=e673]: Flow Dynamics
            - generic [ref=e674]:
              - generic [ref=e675]:
                - text: Flow Identifier
                - textbox [ref=e676]: SYNC_PATH
              - generic [ref=e677]:
                - text: Protocol
                - combobox [ref=e678]:
                  - option "Https" [selected]
                  - option "Http"
                  - option "Ssh"
                  - option "Ftp"
                  - option "Sftp"
                  - option "Samba"
                  - option "NFS"
                  - option "gRPC"
                  - option "AMQP"
                  - option "MQTT"
                  - option "SQL"
                  - option "NoSQL"
                  - option "Custom"
              - generic [ref=e679]:
                - text: Classification
                - generic [ref=e680]:
                  - button "Data Flow" [ref=e681] [cursor=pointer]
                  - button "Auth / Security" [ref=e682] [cursor=pointer]
                  - button "Replication" [ref=e683] [cursor=pointer]
                  - button "Control Plane" [ref=e684] [cursor=pointer]
                  - button "Heartbeat" [ref=e685] [cursor=pointer]
          - generic [ref=e686]:
            - generic [ref=e687]:
              - generic [ref=e688]:
                - heading "Service Path" [level=4] [ref=e689]:
                  - img [ref=e690]
                  - text: Service Path
                - generic [ref=e694]: 1 linked flows
              - generic [ref=e695]:
                - generic [ref=e696]: "Upstream Nodes: 0"
                - generic [ref=e697]: "Downstream Nodes: 1"
            - button "Service Logic Builder" [ref=e698] [cursor=pointer]:
              - img [ref=e699]
              - text: Service Logic Builder
            - button "Sever Connection" [ref=e703] [cursor=pointer]:
              - img [ref=e704]
              - text: Sever Connection
      - generic [ref=e708]:
        - generic [ref=e709]:
          - generic [ref=e711]:
            - img [ref=e713]
            - generic [ref=e717]:
              - heading "Service Logic" [level=3] [ref=e718]
              - paragraph [ref=e719]: Orchestrator
          - generic [ref=e720]:
            - generic [ref=e721]:
              - button "Undo" [ref=e722] [cursor=pointer]:
                - img [ref=e723]
                - text: Undo
              - button "Redo" [disabled] [ref=e726]:
                - img [ref=e727]
                - text: Redo
            - generic [ref=e730]:
              - generic [ref=e731]:
                - generic [ref=e732]: Validation
                - generic [ref=e733]: Production Safety
              - generic [ref=e734]:
                - generic [ref=e735]: "Orphan Steps: 0"
                - generic [ref=e736]: "Dead Ends: 0"
                - generic [ref=e737]: "Unlabeled Flows: 0"
                - generic [ref=e738]: "Missing Failure Branch: 0"
            - generic [ref=e739]:
              - generic [ref=e740]:
                - generic [ref=e741]: Available Participants
                - generic [ref=e742]: "1"
              - button "PW-SVC-1784873451490-nlz1ug SRC Database" [ref=e744] [cursor=pointer]:
                - generic [ref=e745]:
                  - paragraph [ref=e746]: PW-SVC-1784873451490-nlz1ug
                  - img [ref=e747]
                - generic [ref=e748]:
                  - generic [ref=e749]: SRC
                  - paragraph [ref=e750]: Database
          - generic [ref=e751]:
            - button "Sync Workflow" [ref=e752] [cursor=pointer]
            - button "Exit" [ref=e753] [cursor=pointer]
        - generic [ref=e755]:
          - generic:
            - generic: Ingress
            - generic: Core Services
            - generic: External
            - generic: Operations Overlay
          - generic [ref=e756]:
            - generic [ref=e758]:
              - generic:
                - img
            - generic [ref=e759]:
              - generic:
                - generic [ref=e761]:
                  - generic [ref=e763]:
                    - img [ref=e765]
                    - generic [ref=e768]:
                      - heading "PW-ASSET-A-1784873451490-nlz1ug" [level=4] [ref=e769]
                      - paragraph [ref=e770]: SOURCE ASSET
                  - generic [ref=e771]:
                    - button "Logic" [ref=e772] [cursor=pointer]:
                      - img [ref=e773]
                      - generic [ref=e774]: Logic
                    - button "Cond" [ref=e775] [cursor=pointer]:
                      - img [ref=e776]
                      - generic [ref=e778]: Cond
                - generic [ref=e780]:
                  - generic [ref=e781]:
                    - generic [ref=e782]:
                      - img [ref=e784]
                      - generic [ref=e788]:
                        - heading "PW-SVC-TGT-1784873451699-gk6nir" [level=4] [ref=e789]
                        - paragraph [ref=e790]: INTERNAL SERVICE (TARGET)
                    - generic [ref=e791]:
                      - button "Move PW-SVC-TGT-1784873451699-gk6nir lane left" [ref=e792] [cursor=pointer]:
                        - img [ref=e793]
                      - button "Move PW-SVC-TGT-1784873451699-gk6nir lane right" [ref=e795] [cursor=pointer]:
                        - img [ref=e796]
                      - button "Remove PW-SVC-TGT-1784873451699-gk6nir lane" [ref=e798] [cursor=pointer]:
                        - img [ref=e799]
                  - generic [ref=e802]:
                    - button "Logic" [ref=e803] [cursor=pointer]:
                      - img [ref=e804]
                      - generic [ref=e805]: Logic
                    - button "Cond" [ref=e806] [cursor=pointer]:
                      - img [ref=e807]
                      - generic [ref=e809]: Cond
                - generic [ref=e811]:
                  - generic [ref=e813]:
                    - img [ref=e815]
                    - generic [ref=e818]:
                      - heading "PW-ASSET-B-1784873451490-nlz1ug" [level=4] [ref=e819]
                      - paragraph [ref=e820]: DESTINATION ASSET
                  - generic [ref=e821]:
                    - button "Logic" [ref=e822] [cursor=pointer]:
                      - img [ref=e823]
                      - generic [ref=e824]: Logic
                    - button "Cond" [ref=e825] [cursor=pointer]:
                      - img [ref=e826]
                      - generic [ref=e828]: Cond
            - img [ref=e829]
            - generic [ref=e831]:
              - button "zoom in" [ref=e832] [cursor=pointer]:
                - img [ref=e833]
              - button "zoom out" [ref=e835] [cursor=pointer]:
                - img [ref=e836]
              - button "fit view" [ref=e838] [cursor=pointer]:
                - img [ref=e839]
              - button "toggle interactivity" [ref=e841] [cursor=pointer]:
                - img [ref=e842]
            - link "React Flow attribution" [ref=e845] [cursor=pointer]:
              - /url: https://reactflow.dev
              - text: React Flow
    - generic [ref=e847]:
      - generic [ref=e848]:
        - generic [ref=e849]:
          - img [ref=e850]
          - generic [ref=e853]: "YOUR TIME (America/Chicago): 01:10:53"
        - generic [ref=e854]:
          - img [ref=e855]
          - generic [ref=e858]: "SOUTH KOREA (KST): 15:10:53"
      - generic [ref=e859]: VERSION 1.2.6
```

# Test source

```ts
  869  |   const centerLocator = root.locator(`.ag-center-cols-container ${selector}`)
  870  |   const actionLocator = root.locator(`.ag-pinned-right-cols-container ${selector}`)
  871  |   const pinned = await pinnedLocator.count() > 0 ? pinnedLocator.first() : null
  872  |   const center = await centerLocator.count() > 0 ? centerLocator.first() : null
  873  |   const actions = await actionLocator.count() > 0 ? actionLocator.first() : null
  874  | 
  875  |   if (!pinned && !center) {
  876  |     throw new Error(`Resolved ${workspace} logical row "${escapedText}" (${rowIdentity.selector}=${rowIdentity.value}) but could not find pinned or center row fragments.`)
  877  |   }
  878  | 
  879  |   const action = (name: string | RegExp) => {
  880  |     const fragments = [pinned, center, actions].filter((fragment): fragment is Locator => fragment !== null)
  881  |     const candidates = fragments.map((fragment) => fragment.getByRole('button', { name }))
  882  |     const rowAction = candidates.slice(1).reduce((combined, candidate) => combined.or(candidate), candidates[0])
  883  |     return rowAction.describe(`${workspace} logical row ${rowIdentity.selector}=${rowIdentity.value} action ${String(name)}`)
  884  |   }
  885  | 
  886  |   const cell = async (columnId: string) => {
  887  |     const fragments = [pinned, center, actions].filter((fragment): fragment is Locator => fragment !== null)
  888  |     const candidates = fragments.map((fragment) => fragment.locator(`.ag-cell[col-id="${columnId}"]`))
  889  |     const counts = await Promise.all(candidates.map((candidate) => candidate.count()))
  890  |     const total = counts.reduce((sum, count) => sum + count, 0)
  891  |     if (total !== 1) {
  892  |       throw new Error(`Expected exactly one ${workspace} logical row ${rowIdentity.selector}=${rowIdentity.value} cell for col-id="${columnId}" across pinned, center, and action fragments; found ${total}.`)
  893  |     }
  894  |     return candidates[counts.findIndex((count) => count === 1)]
  895  |   }
  896  | 
  897  |   return {
  898  |     rowKey: rowIdentity.value,
  899  |     pinned,
  900  |     center,
  901  |     cell,
  902  |     action,
  903  |   }
  904  | }
  905  | 
  906  | export function getWorkspaceRowByText(page: Page, workspace: WorkspaceId, text: string | RegExp): Locator {
  907  |   return getWorkspaceRoot(page, workspace)
  908  |     .locator('.ag-pinned-left-cols-container .ag-row, .ag-center-cols-container .ag-row')
  909  |     .filter({ hasText: text })
  910  |     .first()
  911  | }
  912  | 
  913  | export async function expectWorkspaceRoute(page: Page, path: string | RegExp) {
  914  |   await expect(page).toHaveURL(typeof path === 'string' ? new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?|$)`) : path)
  915  | }
  916  | 
  917  | export async function gotoView(page: Page, path: string, heading: string | RegExp, workspace?: WorkspaceId) {
  918  |   await page.goto(path)
  919  |   if (workspace) {
  920  |     await expectWorkspaceRoute(page, path.split('?')[0])
  921  |     await expect(getWorkspaceRoot(page, workspace)).toBeVisible()
  922  |   }
  923  |   await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  924  | }
  925  | 
  926  | export function getPrimaryGrid(page: Page, workspace?: WorkspaceId): Locator {
  927  |   return workspace ? getWorkspaceGrid(page, workspace) : page.locator('[role="treegrid"]').first()
  928  | }
  929  | 
  930  | export async function fillGridSearch(page: Page, placeholder: string | RegExp, value: string, workspace?: WorkspaceId) {
  931  |   const search = (workspace ? getWorkspaceRoot(page, workspace) : page).getByPlaceholder(placeholder)
  932  |   await search.fill(value)
  933  |   await page.keyboard.press('Enter')
  934  |   await expect(search).toHaveValue(value)
  935  |   return search
  936  | }
  937  | 
  938  | export async function selectGridCheckboxRows(page: Page, indices: number[]) {
  939  |   const checkboxes = page.locator('.ag-selection-checkbox')
  940  |   for (const index of indices) {
  941  |     await checkboxes.nth(index).click()
  942  |   }
  943  | }
  944  | 
  945  | export async function openToolbarButton(page: Page, name: string | RegExp) {
  946  |   await page.getByRole('button', { name }).first().click()
  947  | }
  948  | 
  949  | export async function expectToast(page: Page, message: string | RegExp) {
  950  |   await expect(page.getByText(message).last()).toBeVisible()
  951  | }
  952  | 
  953  | export async function waitForAppIdle(page: Page) {
  954  |   const loaders = ['Scanning monitoring matrix...', 'Synchronizing Matrix...', 'Scanning infrastructure registry...', 'Synchronizing Intelligence Matrix...', 'Loading...']
  955  |   for (const loader of loaders) {
  956  |     await page.getByText(loader).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  957  |   }
  958  | }
  959  | 
  960  | export async function clickResilientButton(page: Page, ...names: (string | RegExp)[]) {
  961  |   for (const name of names) {
  962  |     const candidates = page.getByRole('button', { name, exact: typeof name === 'string' })
  963  |     const visibleEnabled: Locator[] = []
  964  |     for (let index = 0; index < await candidates.count(); index += 1) {
  965  |       const candidate = candidates.nth(index)
  966  |       if (await candidate.isVisible() && await candidate.isEnabled()) visibleEnabled.push(candidate)
  967  |     }
  968  |     if (visibleEnabled.length > 1) {
> 969  |       throw new Error(`Ambiguous button ${String(name)}: found ${visibleEnabled.length} visible, enabled matches`)
       |             ^ Error: Ambiguous button /^Logic$/: found 3 visible, enabled matches
  970  |     }
  971  |     if (visibleEnabled.length === 1) {
  972  |       await visibleEnabled[0].click()
  973  |       return
  974  |     }
  975  |   }
  976  |   throw new Error(`Could not find one visible, enabled button matching any of: ${names.join(', ')}`)
  977  | }
  978  | 
  979  | export async function verifyGridRowRobust(page: Page, searchString: string | RegExp) {
  980  |   await expect(page.locator('.ag-cell').filter({ hasText: searchString }).first()).toBeVisible({ timeout: 15000 })
  981  | }
  982  | 
  983  | export async function waitForColumnRendered(page: Page, colId: string, timeout = 10000) {
  984  |   const selector = `.ag-header-cell[col-id="${colId}"]`
  985  |   const loc = page.locator(selector).first()
  986  |   await loc.waitFor({ state: 'visible', timeout })
  987  |   
  988  |   await expect.poll(async () => {
  989  |     const box = await loc.boundingBox()
  990  |     return box && box.width > 0 && box.height > 0
  991  |   }, {
  992  |     message: `Waiting for column "${colId}" to render with a non-zero bounding box`,
  993  |     timeout,
  994  |   }).toBeTruthy()
  995  | }
  996  | 
  997  | export async function waitForColumnHidden(page: Page, colId: string, timeout = 10000) {
  998  |   const selector = `.ag-header-cell[col-id="${colId}"]`
  999  |   
  1000 |   await expect.poll(async () => {
  1001 |     const loc = page.locator(selector)
  1002 |     const count = await loc.count()
  1003 |     if (count === 0) return true
  1004 |     for (let i = 0; i < count; i++) {
  1005 |       const isVisible = await loc.nth(i).isVisible()
  1006 |       if (isVisible) {
  1007 |         const box = await loc.nth(i).boundingBox()
  1008 |         if (box && box.width > 0) {
  1009 |           return false
  1010 |         }
  1011 |       }
  1012 |     }
  1013 |     return true
  1014 |   }, {
  1015 |     message: `Waiting for column "${colId}" to be hidden`,
  1016 |     timeout,
  1017 |   }).toBeTruthy()
  1018 | }
  1019 | 
```