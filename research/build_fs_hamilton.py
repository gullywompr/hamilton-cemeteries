"""Write research/fs_hamilton_deaths_1853_1896.csv from one FamilySearch index search.

Search, 30 Oct 2026, under Curtis's account: collection 1708697 (Virginia,
Deaths and Burials, 1853-1912), death place exactly "Harmony, Loudoun,
Virginia, United States" (FamilySearch files Harmony as Hamilton). 96 results,
one page. Rows are the index as shown, in result order. race_index is the
indexer's reading and is known to disagree with the page (README, 30 Oct):
it is a pointer, not a fact. Nothing here is checked against the image yet.
"""
import csv
from pathlib import Path

ARKS = """XRSV-NYM XRSV-NY3 XRMS-3HZ XRMS-6MJ XRSV-J2D XRM9-42V XRMS-RRN XRMS-VPJ XRM9-4G9 XRM3-9V8 XRM9-428 XRM9-HH4 XRMM-8H6 XRM9-MRK XRM9-8LR XRM9-42H XRMS-SRS XRSV-249 XRSV-2WL HJ5H-TCN2 HJ54-49ZM XRMS-RRS XRM3-9V9 XRSV-JV3 XRSJ-X42 XRMS-GYG XRMS-F98 XRMS-3WL XRMM-J6K XRMS-V5Q XRMS-V54 XRSV-JH7
XRSV-JH3 XRSV-JJ6 XRM3-9V4 X511-YS7 XRSJ-P4C XRM9-4LK XRMS-SRX XRSJ-K4S XRM9-DHH XRMS-XFN XRMS-Q65 XRMS-3CM XRMS-3HY XRMS-F99 XRM9-9XS XRMS-HMT XRMS-D68 XRMS-XFK XRM9-DWG XRMS-Q68 XRM9-HWG XRSV-24X XRMS-FMQ XRMS-GT5 HJ5D-WMMM XRSJ-Q9J XRSJ-QMW HJ5H-QQN2 XRSJ-LVR XRM9-4LW XRSJ-LPR XRM9-968
XRMS-PV3 XRM9-96K XRM9-4LM XRM3-9JR HJ5C-372M XRM9-H4W XRMS-Q6F XRM9-HH8 XRMS-QXP XRM9-DPJ XRM9-9XB XRMS-RRD XRMS-R58 XRSJ-P4W XRMS-TYZ XRMS-VH9 XRMS-R59 XRMS-GY6 XRMS-PNL XRM9-HWY XRM9-H4M XRMS-FMT XRMS-PN5 XRMM-JHJ XRMS-RRK XRMM-DG7 HJ1M-J1W2 HJ5W-9H2M HJ5C-MKZM XRMS-157 XRMS-SRV XRMS-PJT""".split()

# name | sex | death date | birth (est.) | birthplace | marital | occupation | race (index) | age | parents | spouse
ROWS = """Napolien B. Riley|M|12 Aug 1865|1853|Near Hamilton|Single|Labourer|white|12|Isaac Riley, Adaline Riley|
Rosa Bell Riley|F|20 Nov 1865|1865|Near Hamilton|Single||white|0|Isaac Riley, Adaline Riley|
John J. Hough|M|8 Aug 1890|1860|Loudoun, Va.|Single|Laborer|colored|30||
Volentine|F|2 Jun 1892||Loudoun, Va.|Unknown||colored||George Volentine, Catherine Volentine|
Mary Berry|F|2 Jan 1866|1800|Shewandock Co.|Single||White|66|Jas. Marlow, Phebe Marlow|
William Berry|M|10 Oct 1884|1819|Virginia|Unknown|Laborer|white|65|Wm. Berry, Mary Berry|Jane Berry
Amanda Lee|F|1 Apr 1874|1857|Loudoun Co.|Single||Colored|17|Geo. Lee, Ellen Lee|
Julia May Lee|F|28 Aug 1894|1885|Hamilton|Single||colored|9|Daniel Lee, Julia Lee|
Isaac F. Hoge|M|1 Jan 1884|1879|Loudoun, Va.|Single||white|5|Isaac C. Hoge, Freddie Hoge|
Thos. L. Hoskinson|M|27 Nov 1875|1801|Maryland|Single|Carpenter|White|74|Nathan Hoskinson, Elizabeth Hoskinson|
Ada Allen|F|7 May 1884|1876|Loudoun, Va.|Single||colored|8|Arch. Allen, Sarah Allen|
Sarah E. Smith|F|8 May 1884|1838|Virginia|Married||white|46|Joshua Hatcher, Sarah Hatcher|Joshua Smith
Mary B. Hawley|F|20 Aug 1878|1878|Loudoun|Single||white|0|Bayless Hawley, Martha Hawley|
Mary E. Baker|F|17 Aug 1883|1859|Maryland|Married||white|24||John R. Baker
Daisey Arnett|F|2 Jan 1885|1883|Loudoun, Va.|Single||white|2|Mahlon T. Arnett, Mollie Arnett|
Mary E. Arnett|F|10 Nov 1884|1870|Loudoun, Va.|Single||white|14|Samuel Arnett, Mary Arnett|
May E. Arnett|F|8 Sep 1890|1890|Loudoun, Va.|Single|None|white|0|Samuel R. Arnett, Mary E. Arnett|
Hannah Arnett|F|9 Aug 1872|1872|Near Hamilton|Single||White|0||
Anna Arnett|F|18 Nov 1872|1785|Ireland|Married||White|87||Wm. Arnett
John Havenner|M|Jul 1865|Jul 1828|Loudoun Co.|Single|Farmer|White|37|Jeremiah Havener, M. Havener|
Rachel A. E. Cooper|F|Aug 1854|Aug 1854|Loudoun|Single||white|0|Peter Cooper, Elizabeth Cooper|
Cato Cooper|M|15 Nov 1874|1839|Loudoun Co.|Married|Laborer|Colored|35|Jno. Cooper, Sallie Cooper|Mollie Cooper
Amy Everitt|F|8 Sep 1875|1869|Hamilton|Single||White|6|John Everett, Harriet Everett|
Arabella Ann Everhart|F|5 Aug 1866|1844|Loudoun County|Single||White|22|Wm. N. Everhart, Cath. Everhart|
Susanna M. Everhart|F|18 Oct 1855|1843|Loudoun|Single||white|12|Nathe. Everht, Darcus Everht|
Ella M. Downs|F|11 Aug 1873|1873|Near Hamilton|Single||White|0|Cicero Downes, Martha E. Downes|
Henry Clarke|M|6 Aug 1893|1866|Loudoun, Va.|Unknown||colored|27|W. H. Clarke, Maria Clarke|
Charles Clark|M|15 Mar 1890|1875|Loudoun, Va.|Single|None|colored|15|Richard Clark, Mary Clark|
Silcott|F|20 Aug 1880|1880|Loudoun, Va.|Single||white|0|Jas. E. Silcott, Mary Silcott|
Adeline Preston|F|28 Feb 1894|1859|Loudoun|Unknown||white|35|Zenith, Sarah|
Ral G. Preston|F|18 Mar 1894|1893|Hamilton|Single||white|1|Edgar T. Preston, Ada Preston|
John Morgan|M|7 Aug 1866|1794|Loudoun County|Married||White|72||Sarah Morgan
Sarah Morgan|F|15 May 1866|1808|Loudoun County|Married||White|58||John Morgan
James A. Bentley|M|6 Aug 1866|1865|Near Hamilton|Single||Colored|1|Adaline Bentley|
Laura E. Harman|F|20 Dec 1875|1848|Loudoun Co.|Married|Physician|White|27|R. Dowill, Malinda Dowill|J. D. Harmon
Harriet Emeline Harmson|F|14 Feb 1876||Loudoun|Single||white||J. D. Harman, Laura E. Harman|
Conrad R. Dowell|M|18 Feb 1857|1804|Near Hamilton|Married|Farmer|white|53|Elisha Dowell, Ann Dowell|Malinda Dowell
Jane Humphrey|F|1 Aug 1884|1832|Hamilton|Married||colored|52||Wm. Humphrey
Sarah E. Beales|F|23 Jul 1890|1863|Loudoun, Va.|Married|None|white|27|Mort Beales, Sarah Beales|J. E. Beales
William Rouse|M|15 Jul 1856|1824|Near Hamilton|Married|Farmer|white|32|Solomon Ruse, Tobitha Ruse|Louisa Ruse
Fanny Nichols|F|23 Jul 1885|1797|Loudoun|Unknown||white|88|Edwd. McDaniel, Ann McDaniel|Thos. Nichols
A. Jessup Nicholson|M|22 May 1893|1847|Hamilton|Unknown|U.S. Officer|white|46|A. S. Nicholson, J. J. Nicholson|
Fannie Powell|F|20 Oct 1890|1872|Loudoun, Va.|Single|None|white|18|I. G. Powell, Lydie C. Powell|
Leuisa Levenberry|F|4 Jul 1890|1837|Loudoun, Va.|Single|None|colored|53|Elwood Levenberry, Leuisa Levenberry|Elwood Levenberry
Helen Levenberry|F|21 Feb 1890|1868|Loudoun, Va.|Single|None|colored|22|Elwood Levenberry, Leusa Levenberry|
Permelia A. Orrison|F|12 Dec 1893|1818|Loudoun, Va.|Unknown||white|75|James Henry McGarick, Pleasant McGarick|
Samuel Orrison|M|6 Oct 1883|1810|Loudoun, Va.|Unknown|Farmer|white|73||Margaret Orrison
W. P. Orrison|F|12 Mar 1891|1814|Hamilton|Unknown||white|77|Mrs. W. P. Orrison|
Bertha Lee Brown|F|20 Apr 1892|1873|Hamilton|Unknown||white|19|J. Edwin Brown, Gertrude A. Brown|
Elizabeth Love|F|9 Dec 1893|1810|Loudoun, Va.|Unknown||white|83||
Lydia A. Cox|F|21 Oct 1885|1808|Loudoun, Va.|Unknown||white|77||James Cox
Elizabeth McCray|F|9 Feb 1890|1814|Loudoun, Va.|Married|None|white|76|John Gregg, Sallie Gregg|Wm. McCray
Estelle G. James|F|12 May 1884|1879|Virginia|Single||white|5|A. C. James, Sarah F. James|
Rodney G. Hatcher|M|8 Dec 1872|1833|Near Hamilton|Married|Farmer|White|39|Thos. Hatcher, Nancy Hatcher|Mary F. Hatcher
Helen Collins|F|11 Jul 1893|1820|Loudoun, Va.|Unknown||colored|73||
Elizabeth Gregg|F|24 Jun 1896|1818|Hamilton|Unknown||white|78|Wm. Gregg, Elizabeth Gregg|
Hailey Wood|F|Aug 1894|Aug 1876|Hamilton, Va.|Unknown||colored|18|Hamilton Wood, Mary Wood|
Samuel W. Greer|M|4 Jul 1854|1854|Near Hamilton|Single||white|0|T. W. Greer, Elizabeth Greer|
Harriet Russell|F|1 Sep 1854|1850|R. B. Factory|Single||white|4|Caleb Russell, Elizabeth Russell|
Bettie Janney|F|Sep 1876|Sep 1843|Loudoun|Single||white|33|John Janney, Elizabeth Janney|
Nathan H. Janney|M|30 Nov 1857|1818|Janney's Mill|Married|Physician|white|39|Daniel Janney, Elizth. Janney|Lydia J. Janney
Dora Franklin|F|12 Mar 1884|1881|Hamilton, Va.|Single||white|3|Webster Franklin, Lucy Franklin|
Elizabeth V. Mock|F|11 Sep 1857|1844|Near Peugh's|Single||white|13|Jos. C. Mock, Mary Mock|
J. William Dear|M|14 Jul 1883|1844|Loudoun, Va.|Married|Merchant|white|39||Mary R. Dear
Elizabeth R. Holmes|F|5 Nov 1873|1801|Near Hamilton|Married||White|72|Hamilton Rogers, Dinah Rogers|Elijah Holmes
Blanche Holmes|F|15 Jul 1883|1883|Loudoun, Va.|Single||white|0|George W. Holmes, Rebecca Holmes|
Grace T. Dunbar|F|29 Jul 1884|1813|Iowa|Single||white|71|Edward Dunbar, Clyde Dunbar|
Mary Elizabeth Davis|F|13 Feb 1875||Hamilton|Single||White||Albert C. Davis, Susan E. Davis|
George W. White|M|May 1891|May 1839|Hamilton|Unknown||colored|52||
Mary A. Mitchell|F|15 Jan 1884|1883|Virginia|Single||colored|1|Wm. Mitchell, Sarah Mitchell|
Helen N. Moran|F|2 Nov 1890|1888|Loudoun, Va.|Single|None|white|2|W. H. Miran|
Mahlon Tavenner|M|17 Sep 1884|1823|Virginia|Unknown|Farmer|white|61|Joseph Tavenner, Ann Tavenner|Susan Tavenner
Susen Tavenner|F|2 Oct 1890|1810|Loudoun, Va.|Single|None|white|80||
Susan A. Tavenner|F|20 Dec 1885|1826|Va.|Unknown||white|59|Jonah Nichols, Fanny Nichols|Mahlon Tavenner
Soloman Lucas|M|12 Nov 1883|1804|Loudoun, Va.|Unknown|Laborer|colored|79||
Mary J. Hill|F|1 Mar 1874|1847|Loudoun Co.|Single||Colored|27|Lewis Hill, Dusey Hill|
Ernest E. Virts|M|18 Dec 1873|1872|Loudoun Co., Va.|Single||White|1|Charles W. Virts, Trey V. Virts|
Ruth W. Taylor|F|8 Dec 1857|1813|Near Chamblin's Mill|Married||white|44|Mary Bradfield|Lewis Taylor
Ruth Weadon|F|27 Oct 1874|1871|Near Hamilton|Single||White|3|Chas. Weadon, Mary Weadon|
Jane A. Evans|F|13 May 1894|1818|Hamilton|Married||white|76|Evan Evans, Hannah Evans|
Alcinda Warner|F|20 Aug 1873|1820|Loudoun Co., Va.|Married||White|53|Thos. Lovelefs, Catherine Lovelefs|George Warner
Laura Virginia Walton|F|17 Sep 1896|1860|Hamilton|Married||white|36|Robt. Delaney, Virginia Rose Delaney|
Jackson|M|11 Apr 1873|1873|Near Hamilton|Single||Colored|0|Clarence Jackson, Elen Jackson|
Lowe|M|10 Aug 1884|1884|Virginia|Single||white|0|Joseph Low, America Low|
Lowe|M|25 Aug 1884|1884|Virginia|Single||white|0|Joseph Low, America Low|
Annie A. Lowe|F|4 Aug 1893|1842|Loudoun, Va.|Married||white|51|Washington Silcott, Kate Silcott|Thomas Lowe
Parker Mussey|M|15 Sep 1873|1838|Near Hamilton|Married|Laborer|Colored|35|Edward Mussey, Bettie Mussey|Nancy Mussey
Mary E. Muse|F|26 Nov 1880|1822|Loudoun, Va.|Married||white|58||James Muse
Israel Myers|M|10 Oct 1874|1814|Loudoun Co.|Married|Farmer|White|60|Maklen Myers, Mahala Myers|Mary Myers
Laura C. Wiley|F|19 May 1879|1858|Hamilton|Unknown||white|21|John Wiley, Malinda Wiley|
Clifford C. Wiley|M|Apr 1873|Apr 1873|Hamilton|Single||White|0|John H. Wiley, Malinda A. Wiley|
Estella Wiley|F|Nov 1876|Nov 1875|Loudoun|Single||white|1|W. H. Wiley, Nannie E. Wiley|
Mary Haines|F|Jan 1896|Jan 1819||Unknown||white|77||
Vandevanter|M|21 Oct 1875|1875|Loudoun|Single||White|0|T. H. Vandevanter, Nannie Vandevanter|
Catharine Champ|F|27 Jan 1890|1812|Loudoun, Va.|Unknown|None|colored|78||
John F. Harrison|M|29 Aug 1873|1872|Hamilton|Single||White|1|John D. Harrison, Laura Harrison|""".splitlines()

assert len(ARKS) == len(ROWS) == 96, (len(ARKS), len(ROWS))

# Read off the page, 30 Oct 2026: film 004225400, item 4 (Register of Deaths
# 1865-1896), image 134 of the item, the 1890 Hamilton page. The register has
# two colour columns before sex. The column header was not legible on screen;
# the first column carries May E. Arnett and Sarah E. Beales (white in the
# index and the timeline), so first = white, second = colored, by that
# consistency.
#
# The other 17 the index calls colored were read the same day. Image numbers
# are within item 4 ("of 173"). Where the header is legible it reads White |
# Colored | Male | Female; where it is not, the column is read from rows on
# the same page whose race the index and the timeline agree on.
VERIFIED = {
    'XRMS-3CM': 'image 134: second colour column (colored)',   # Leuisa Levenberry
    'XRMS-3HY': 'image 134: second colour column (colored)',   # Helen Levenberry
    'XRMS-3HZ': 'image 134: FIRST colour column (white); the index says colored and is wrong',  # John J. Hough
    'XRMS-SRS': 'image 134: first colour column (white)',      # May E. Arnett
    'XRMS-SRV': 'image 134 line 7: second colour column (colored)',   # Catharine Champ
    'XRMS-3WL': 'image 134 line 11: second colour column (colored)',  # Charles Clark
    'XRMS-6MJ': 'image 150 line 23: under a written "Colored" heading; an unnamed infant, father George Volentine',
    'XRMS-RRS': 'image 24 line 4: Colored (header legible)',          # Cato Cooper
    'XRMS-RRD': 'image 24 line 7: Colored (header legible)',          # Mary J. Hill
    'XRMS-RRN': 'image 24 line 9: Colored (header legible)',          # Amanda Lee
    'XRM9-428': 'image 95 line 2: Colored (header legible)',          # Ada Allen
    'XRM9-4LK': 'image 95 line 14: Colored (header legible)',         # Jane Humphrey
    'XRM9-H4W': 'image 95 line 29: Colored (header legible)',         # Mary A. Mitchell
    'XRMS-PNL': 'image 20 line 6: second colour column (colored); page faded',   # Jackson infant
    'XRMS-PN5': 'image 20 line 7: second colour column (colored); page faded',   # Parker Mussey
    'XRMS-F98': 'image 154 line 13: second colour column (colored)',  # Henry Clarke
    'XRMS-FMQ': 'image 153 line 16: second colour column (colored)',  # Helen Collins
    'XRMS-VPJ': 'image 162 line 22: second colour column (colored)',  # Julia May Lee
    'XRM9-9XB': 'image 86 line 23: Colored (header legible)',         # Soloman Lucas
    'HJ5D-WMMM': 'image 162 line 37: NOT CONFIRMED, entries crowded at the foot of the page',  # Hailey Wood
    'HJ5C-372M': 'image 141 line 29: NOT CONFIRMED, ditto marks too close to read the column',  # George W. White
    'XRSV-JJ6': 'film image 250 (1866): NOT CONFIRMED, the record gives no line and he was not found on the page',  # James A. Bentley
}
HEAD = ['fs_ark', 'name', 'sex', 'death_date', 'birth_est', 'birthplace', 'marital', 'occupation',
        'race_index', 'age', 'parents', 'spouse', 'verified_on_image']
out = Path(__file__).with_name('fs_hamilton_deaths_1853_1896.csv')
with open(out, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(HEAD)
    for ark, row in zip(ARKS, ROWS):
        p = row.split('|')
        assert len(p) == 11, row
        w.writerow(['https://www.familysearch.org/ark:/61903/1:1:' + ark] + p + [VERIFIED.get(ark, 'no')])
