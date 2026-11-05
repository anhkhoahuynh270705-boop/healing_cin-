package com.healingcinema.donation.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.healingcinema.donation.dto.DonationDtos.Config;
import com.healingcinema.donation.dto.DonationDtos.Tier;

@Service
public class DonationConfigService {
    private static final List<Tier> TIERS = List.of(
            new Tier("vip", "Đồng Cỏ May", 20_000, "#f2c46d"),
            new Tier("chien-than", "Ánh Trăng Bạc", 50_000, "#6cb4ff"),
            new Tier("huy-diet", "Hoàng Kim Vương Giả", 100_000, "#ff7a7a"),
            new Tier("bat-tu", "Tinh Vân Kim Cương", 200_000, "#b79cff"),
            new Tier("huyen-thoai", "Hỏa Long Bảo Châu", 500_000, "#5fe3c0"),
            new Tier("ho-de", "Thần Long Hoàng Gia", 1_000_000, "#ffb347"));

    private final String bank;
    private final String bankCode;
    private final String accountNumber;
    private final String accountName;
    private final String zaloUrl;
    private final int lightAmount;

    public DonationConfigService(
            @Value("${app.donation.bank:Techcombank}") String bank,
            @Value("${app.donation.bank-code:TCB}") String bankCode,
            @Value("${app.donation.account-number:1221868856}") String accountNumber,
            @Value("${app.donation.account-name:HUYNH ANH KHOA}") String accountName,
            @Value("${app.donation.zalo-url:https://zalo.me/}") String zaloUrl,
            @Value("${app.donation.light-amount:10000}") int lightAmount) {
        this.bank = bank;
        this.bankCode = bankCode;
        this.accountNumber = accountNumber;
        this.accountName = accountName;
        this.zaloUrl = zaloUrl;
        this.lightAmount = lightAmount;
    }

    public Config getConfig() {
        return new Config(bank, bankCode, accountNumber, accountName, zaloUrl, lightAmount, TIERS);
    }

    public List<Tier> getTiers() {
        return TIERS;
    }

    public Tier findTier(long totalConfirmed) {
        return TIERS.stream().filter(tier -> totalConfirmed >= tier.amount()).reduce((a, b) -> b).orElse(null);
    }

    public Tier nextTier(long totalConfirmed) {
        return TIERS.stream().filter(tier -> totalConfirmed < tier.amount()).findFirst().orElse(null);
    }
}
