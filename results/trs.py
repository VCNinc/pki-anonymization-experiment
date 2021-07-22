import matplotlib.pyplot as plt
xscale = [2,4,8,16,32,64]
plt.plot(xscale, [76.47459996, 122.0868, 396.3303001, 1399.1319, 5120.5124, 19918.6417], label="Our Implementation\n(VCNinc/trs-js)", linestyle='solid')
plt.plot(xscale, [209.2467, 346.4025999, 885.0221, 2751.4942, 10101.0389, 33925.5512], label="MaiaVictor/lrs", linestyle='dashed')
plt.plot(xscale, [1643.9066, 3456.3743, 8813.9086, 27500.7015, 93863.0077, 371789.9735], label="parabirb/lrs14", linestyle='dashdot')
plt.plot(xscale, [268.30, 535.40, 1447.86, 4745.44, 17447.66, 70009.75], label="osoese/ring", linestyle='dotted')
plt.yscale("log")
# plt.xscale("log")
plt.xticks(xscale)
plt.ylabel("Signature Verification Time (ms)")
plt.xlabel("Ring Size (Number of Keys)")
plt.legend()
plt.show()
