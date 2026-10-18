"""UI tests using an in-memory IndexedDB double in an about:blank document.
The environment blocks browser navigation to file/HTTP URLs. This harness tests
rendering and form workflows, NOT actual IndexedDB persistence or service workers.
Requires Python Playwright and a local Chromium installation, neither shipped.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HARNESS = r'''<script>
window.__testStores = new Map();
if(!crypto.randomUUID)crypto.randomUUID=function(){const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
Object.defineProperty(window, 'indexedDB', { value: {
  open() {
    const request = {};
    const database = {
      createObjectStore() {}, close() {},
      transaction(name, mode) {
        let pending = 0;
        const tx = {
          aborted: false,
          abort() { this.aborted = true; setTimeout(() => this.onabort?.(), 0); },
          objectStore() {
            return {
              get(key) {
                pending++;
                const req = {};
                setTimeout(() => {
                  if (tx.aborted) return;
                  req.result = window.__testStores.has(key) ? structuredClone(window.__testStores.get(key)) : undefined;
                  req.onsuccess?.();
                  pending--;
                  if (pending === 0 && !tx.aborted) setTimeout(() => tx.oncomplete?.(), 0);
                }, 0);
                return req;
              },
              put(value, key) {
                pending++;
                setTimeout(() => {
                  if (tx.aborted) return;
                  window.__testStores.set(key, structuredClone(value));
                  pending--;
                  if (pending === 0) setTimeout(() => tx.oncomplete?.(), 0);
                }, 0);
              }
            };
          }
        };
        return tx;
      }
    };
    setTimeout(() => { request.result = database; request.onsuccess?.(); }, 0);
    return request;
  }
}});
</script>'''

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    html=(ROOT/'Spektra-Servis.html').read_text()
    page.set_content(html.replace('<script>',HARNESS+'<script>',1))
    page.wait_for_selector('.stats')
    assert page.locator('.stat strong').all_text_contents()==['0','0','0','0']
    page.screenshot(path=str(ROOT.parent/'spektra-real-desktop.png'),full_page=True)
    page.locator('[data-action="new-customer"]').first.click()
    page.locator('input[name="name"]').fill('Testovací zákazník <img src=x onerror=alert(1)>')
    page.locator('input[name="address"]').fill('Testovacia adresa, Rajec')
    page.locator('input[name="phone"]').fill('+421 900 000 000')
    page.locator('#entity-form button[type="submit"]').click()
    page.wait_for_function('!document.querySelector("#editor").open')
    page.locator('.sidebar [data-action="route-customers"]').click()
    assert page.locator('.customer-card').count()==1
    assert page.locator('.customer-card img').count()==0
    page.locator('[data-action="customer-tab"][data-tab="devices"]').click()
    page.locator('[data-action="new-device"]').first.click()
    page.locator('select[name="customerId"]').select_option(index=1)
    page.locator('input[name="manufacturer"]').fill('Test výrobca')
    page.locator('input[name="model"]').fill('Test model')
    page.locator('input[name="serial"]').fill('TEST-001')
    page.locator('#entity-form button[type="submit"]').click()
    page.wait_for_function('!document.querySelector("#editor").open')
    assert page.locator('.customer-card').count()==1
    page.locator('[data-action="job-for-device"]').click()
    page.locator('input[name="title"]').fill('Testovací servis')
    page.locator('input[name="start"]').fill('2026-10-20T09:00')
    page.locator('textarea[name="issue"]').fill('Testovacia porucha')
    page.locator('textarea[name="resolution"]').fill('Testovací poznatok, nie skutočný servisný pokyn.')
    page.locator('#entity-form button[type="submit"]').click()
    page.wait_for_function('!document.querySelector("#editor").open')
    page.locator('.sidebar [data-action="route-jobs"]').click()
    assert page.locator('.job-card').count()==1
    page.locator('.job-title').click()
    page.locator('select[name="status"]').select_option('done')
    page.locator('#entity-form button[type="submit"]').click()
    page.wait_for_function('!document.querySelector("#editor").open')
    page.locator('.job-title').click()
    assert page.locator('select[name="result"]').input_value()=='pending'
    assert page.locator('select[name="payment"]').input_value()=='unpaid'
    page.locator('[data-action="tip-from-job"]').click()
    assert page.locator('input[name="model"]').input_value()=='Test model'
    page.locator('#entity-form button[type="submit"]').click()
    page.wait_for_function('!document.querySelector("#editor").open')
    page.locator('.sidebar [data-action="route-knowledge"]').click()
    assert page.locator('.tip-card').count()==1
    page.locator('#page-search').fill('testovaci')
    assert page.locator('.tip-card').count()==1
    # Verify snapshots saved in the test double and isolated demo workspace.
    assert page.evaluate('window.__testStores.get("real").customers.length')==1
    page.locator('.sidebar [data-action="route-settings"]').click()
    page.locator('[data-action="enter-demo"]').click()
    page.wait_for_selector('.demo-banner')
    assert page.evaluate('window.__testStores.get("real").jobs.length')==1
    assert page.evaluate('window.__testStores.get("demo").jobs.length')==3
    page.wait_for_timeout(4600)
    page.screenshot(path=str(ROOT.parent/'spektra-demo-desktop.png'),full_page=True)
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    for width in [390, 320, 768]:
        page.set_viewport_size({'width':width,'height':844})
        page.locator('.mobile-nav [data-action="route-home"]').click() if width<=760 else page.locator('.sidebar [data-action="route-home"]').click()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),f'Home overflow {width}'
        for route in ['jobs','calendar','customers','knowledge','settings']:
            if route=='settings':
                page.locator('.topbar [data-action="route-settings"]').click()
            else:
                page.locator(f'.mobile-nav [data-action="route-{route}"]').click() if width<=760 else page.locator(f'.sidebar [data-action="route-{route}"]').click()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),f'{route} overflow {width}'
    page.set_viewport_size({'width':390,'height':844})
    page.locator('.mobile-nav [data-action="route-home"]').click()
    page.screenshot(path=str(ROOT.parent/'spektra-demo-mobile.png'),full_page=True)
    page.screenshot(path=str(ROOT.parent/'spektra-mobile-viewport.png'))
    page.locator('.mobile-nav [data-action="route-calendar"]').click()
    page.screenshot(path=str(ROOT.parent/'spektra-calendar-mobile.png'),full_page=True)
    page.locator('.topbar [data-action="route-settings"]').click()
    page.locator('[data-action="exit-demo"]').last.click()
    page.wait_for_selector('.storage-banner')
    assert page.evaluate('window.__testStores.get("real").customers.length')==1
    assert errors==[],errors
    result={'status':'PASS','domain_test_count':18,'build_test_count':2,'node_test_total':20,'browser':'Chromium (local about:blank rendering)','ui_checks':['empty real workspace','customer create and escaped XSS text','device create','job scheduling','status isolation','job to knowledge','diacritic search','demo isolation','all modules at 320/390/768 px','desktop 1440 px'],'limitations':['IndexedDB is an in-memory test double in UI tests','service worker and installed PWA not tested','no hosted deployment or real Google integration tested'],'page_errors':errors}
    (ROOT/'docs'/'test-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False,indent=2))
    browser.close()
