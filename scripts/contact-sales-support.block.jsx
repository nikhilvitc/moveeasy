          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="mb-6"
                id="sales"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Sales team</h2>
                <p className="mt-2 text-sm max-w-2xl" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Flat search, guarantee plans, and visit scheduling — call or WhatsApp directly.
                </p>
              </motion.div>
              <div className={`grid gap-8 ${gridCols}`}>
                {contacts.map((c, i) => (
                  <TeamContactCard
                    key={`${c.name}-${c.phoneRaw}-${i}`}
                    contact={c}
                    index={i}
                    waMessage={SALES_WA_GREETING}
                  />
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2, ease: EASE }}
                className="mt-14"
                id="support"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Customer support</h2>
                <p className="mt-2 text-sm max-w-2xl mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Account access, payments, guarantee claims, and listing issues — we aim to reply within one business day.
                </p>
                <div
                  className="max-w-xl rounded-2xl p-7 flex flex-col sm:flex-row sm:items-center gap-5"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                      style={{ color: "#ff8a7a" }}
                    >
                      Support
                    </p>
                    <p className="font-bold text-lg text-white">MovEazy customer support</p>
                    <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                      Email us for non-urgent help; use sales WhatsApp above for flat search and visits.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:shrink-0">
                    <a
                      href={`mailto:${supportEmail}`}
                      className="text-center py-3 px-5 rounded-xl font-semibold text-[14px] text-white"
                      style={{
                        background: "linear-gradient(135deg, #e85a4f, #f97316)",
                        boxShadow: "0 4px 16px rgba(232,90,79,0.35)",
                      }}
                    >
                      ✉️ {supportEmail}
                    </a>
                    <a
                      href={supportTel}
                      className="text-center py-3 px-5 rounded-xl font-semibold text-[14px] text-white"
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.16)",
                      }}
                    >
                      📞 {supportPhone}
                    </a>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {/* Why talk to us */}
