import json
import matplotlib.pyplot as plt
from matplotlib.ticker import FixedLocator, FixedFormatter
import os
import numpy as np


def get_data_from_directory(directory):

    files = os.listdir(directory)

    return {int(name.split('-')[-2]): json.load(open(directory + "/" + name, "r")) for name in files}


all_node_counts = np.array([2**i for i in range(1, 13)])


def trendline_plot(directory):

    data = get_data_from_directory(directory)

    node_counts = np.array(sorted([i for i in data]))

    avg_times = np.array([data[i]["aggregates"]["times"]["total"]["mean"] for i in node_counts])

    plt.scatter(node_counts, avg_times)

    plt.xlabel('# of Nodes')
    plt.ylabel('Avg time to completion (ms)')

    # plt.xlim([2, 4096])

    plt.xscale('log')
    plt.yscale('log')

    print("fitting")

    z = np.polyfit(np.log(node_counts[5:]), np.log(avg_times[5:]), 1)

    print(z)

    p = np.poly1d(z)

    print(all_node_counts, np.exp(p(np.log(all_node_counts))))

    plt.plot(all_node_counts, np.exp(p(np.log(all_node_counts))), "r--", label="Power Law Fit")

    z = np.polyfit(node_counts, avg_times, 2)

    print(z)

    # print(all_node_counts, p(all_node_counts))

    p = np.poly1d(z)
    plt.plot(all_node_counts, p(all_node_counts), "g--", label="Quadratic Fit")

    plt.legend()

    os.makedirs(f"./img/{directory}", exist_ok=True)
    plt.savefig(f"img/{directory}/multitrendline.png")


# trendline_plot("local/reconstitution")
# trendline_plot("local/single-value-consensus")
# trendline_plot("benchmarks/networks")
# trendline_plot("benchmarks/svc-1phase-vs-3phase-comparison/svc-1phase")
# trendline_plot("benchmarks/svc-1phase-vs-3phase-comparison/svc-3phase")
# trendline_plot("benchmarks/svc-link-optimize-comparison/svc-optimized")
# trendline_plot("benchmarks/svc-link-optimize-comparison/svc-unoptimized")
# trendline_plot("remote/single-value-consensus")
# trendline_plot("final/single-chat-room-trs")


# quit()


def generate_stacked_bar_plot(directory):

    data = get_data_from_directory(directory)

    task_names = data[2]["reports"][0]["times"]["events"]

    list_of_values1 = []

    for task in task_names:
        values = []

        for size in sorted(data):

            times = []

            for report in data[size]["reports"]:

                v = report["times"]["events"]

                times.append(v[task]["end"]-v[task]["start"])

            avg = sum(times)/len(times)
            values.append(avg)
        list_of_values1.append(values)

    # Plot
    print("Generating Plot")

    labels = [str(d) for d in sorted(data)]

    print(labels)

    width = 0.35

    fig, ax = plt.subplots()

    print(list_of_values1)

    # ax.bar(labels, [1 for l in labels], width, label="foo")

    # ax.bar(labels, [1 for l in labels], width, label="bar")

    # bottom = [0 for l in labels]

    for values1, task in zip(list_of_values1, task_names):
        print(task, values1, "\n")

        ax.bar(labels, values1, width, label=task)

        # for l in range(len(labels)):
        #     bottom[l] += values1[l]

    ax.set_ylabel('Avg time')
    # ax.set(yscale="log")

    ax.set_title('Bar Chart of TImes for Different Phases')
    ax.legend()
    # plt.setp(ax.get_xticklabels(), rotation=30, horizontalalignment='right')

    print("saving")

    os.makedirs(f"./img/{directory}", exist_ok=True)

    plt.savefig(f"img/{directory}/stackedbar.png")


# generate_stacked_bar_plot("final/single-value-consensus")

# quit()

def generate_plot_by_subtask(directory):

    data = get_data_from_directory(directory)

    task_names = data[2]["reports"][0]["times"]["events"]

    list_of_values1 = []

    for task in task_names:
        values = []

        for size in sorted(data):

            # times = []

            # for report in data[size]["aggregates"]:

            #     v = report["times"]["events"]

            #     times.append(v[task]["end"]-v[task]["start"])

            avg = data[size]["aggregates"]["times"]["events"][task]["mean"]
            values.append(avg)
        list_of_values1.append(values)

    total_values = []

    for size in sorted(data):

        # times = []

        # for report in data[size]["aggregates"]:

        #     v = report["times"]["events"]

        #     times.append(v[task]["end"]-v[task]["start"])

        avg = data[size]["aggregates"]["times"]["total"]["mean"]
        total_values.append(avg)

    # Plot
    print("Generating Plot")

    # labels = [str(d) for d in sorted(data)]

    # print(labels)

    # width = 0.35

    # fig, ax = plt.subplots()

    print(list_of_values1)

    # ax.bar(labels, [1 for l in labels], width, label="foo")

    # ax.bar(labels, [1 for l in labels], width, label="bar")

    # bottom = [0 for l in labels]
    plt.plot(sorted(data), total_values, label="Total", color="blue")

    z = np.polyfit(np.log(sorted(data)[5:]), np.log(total_values[5:]), 1)

    print(z)

    p = np.poly1d(z)

    # print(all_node_counts, np.exp(p(np.log(all_node_counts))))

    # plt.plot(sorted(data) + [512, 1024], total_values + list(np.exp(p(np.log([512, 1024])))), alpha=0.35, color="grey")

    linestyle_tuple = [
        # ('loosely dotted',        (0, (1, 10))),
        ('dotted',                (0, (1, 1))),
        # ('densely dotted',        (0, (1, 1))),

        ('loosely dashed',        (0, (5, 10))),
        ('dashed',                (0, (5, 5))),
        ('densely dashed',        (0, (5, 1))),

        ('loosely dashdotted',    (0, (3, 10, 1, 10))),
        ('dashdotted',            (0, (3, 5, 1, 5))),
        ('densely dashdotted',    (0, (3, 1, 1, 1))),

        ('dashdotdotted',         (0, (3, 5, 1, 5, 1, 5))),
        ('loosely dashdotdotted', (0, (3, 10, 1, 10, 1, 10))),
        ('densely dashdotdotted', (0, (3, 1, 1, 1, 1, 1)))]

    colors = ["green", "purple", "blue", "red", "green", "purple", "blue", "red"]

    for values1, task, (name, linestyle), color in zip(list_of_values1, task_names, linestyle_tuple, colors):
        print(task, values1, "\n")

        task = task.replace("three", "3")

        plt.plot(sorted(data), values1, label=task, linestyle=linestyle)

        print("fitting")

        z = np.polyfit(np.log(sorted(data)[5:]), np.log(values1[5:]), 1)

        print(z)

        p = np.poly1d(z)

        # print(all_node_counts, np.exp(p(np.log(all_node_counts))))

        # plt.plot(sorted(data) + [512, 1024], values1 + list(np.exp(p(np.log([512, 1024])))), linestyle=linestyle, alpha=0.35, color="grey")

        # for l in range(len(labels)):
        #     bottom[l] += values1[l]

    plt.ylabel('Avg time (ms)')
    plt.xlabel('Nodes')
    plt.xscale("log")
    plt.yscale("log")
    # plt.xlim((2, 1024))
    plt.ylim((1e-1, 1e6))
    plt.tick_params(
        axis='x',          # changes apply to the x-axis
        which='minor',      # both major and minor ticks are affected
        bottom=False,      # ticks along the bottom edge are off
        top=False,         # ticks along the top edge are off
        labelbottom=False)  # labels along the bottom edge are off
    ticks = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]
    plt.xticks(ticks=ticks, labels=[str(d) for d in ticks])

    plt.title('Times for Different Protocol Phases')
    plt.legend(prop={'size': 7.5}, frameon=False)
    # plt.setp(ax.get_xticklabels(), rotation=30, horizontalalignment='right')

    print("saving")

    os.makedirs(f"./img/{directory}", exist_ok=True)

    plt.savefig(f"img/{directory}/plotbysubtask.png")


generate_plot_by_subtask("final/reconstitution")


def generate_grouped_svc_1_vs_3_plot():

    data_svc1 = get_data_from_directory("svc-1phase")

    task_names = data_svc1[2]["reports"][0]["times"]["events"]

    list_of_values1 = []

    for task in task_names:
        values = []

        for size in sorted(data_svc1):

            times = []

            for report in data_svc1[size]["reports"]:

                v = report["times"]["events"]

                times.append(v[task]["end"]-v[task]["start"])

            avg = sum(times)/len(times)
            values.append(avg)
        list_of_values1.append(values)

    # Gather svc3 data

    data_svc3 = get_data_from_directory("svc-3phase")

    task_names = data_svc3[2]["reports"][0]["times"]["events"]

    list_of_values3 = []

    for task in task_names:
        values = []

        for size in sorted(data_svc1):

            times = []

            for report in data_svc3[size]["reports"]:

                v = report["times"]["events"]

                times.append(v[task]["end"]-v[task]["start"])

            avg = sum(times)/len(times)
            values.append(avg)
        list_of_values3.append(values)

    # Plot
    print("Generating Plot")

    labels1 = [str(d) + "-SVC1" for d in sorted(data_svc1)]
    labels3 = [str(d) + "-SVC3" for d in sorted(data_svc1)]

    labels = [val for pair in zip(labels1, labels3) for val in pair]

    print(labels)

    width = 0.35

    fig, ax = plt.subplots()

    print(list_of_values1)
    print(list_of_values3)

    for values1, values3, task in zip(list_of_values1, list_of_values3, task_names):
        values = [val for pair in zip(values1, values3) for val in pair]
        print(values)
        ax.bar(labels, values, width, label=task)

    ax.set_ylabel('Avg time')
    ax.set(yscale="log")

    ax.set_title('Avg time of tasks by cluster size, (SVC-1 Left/SVC-3 Right)')
    ax.legend()
    plt.setp(ax.get_xticklabels(), rotation=30, horizontalalignment='right')

    plt.savefig(f"SVC-1-vs-3-bar.png")


# generate_grouped_svc_1_vs_3_plot()


def generate_benchmark_plot():

    data = get_data_from_directory("benchmarks")

    # small/medium/large
    # identical/unique
    # 2-256
    # open covert threephase

    totals = np.zeros((3, 2, 8, 3))
    counts = np.zeros((3, 2, 8, 3))

    node_counts = [2, 4, 8, 16, 32, 64, 128, 256]

    for (i, nodes) in zip(range(8), node_counts):
        for report in data[nodes]["reports"]:
            for name in report["times"]["events"]:
                if "small" in name:
                    size = 0
                if "medium" in name:
                    size = 1
                if "large" in name:
                    size = 2
                if "identical" in name:
                    foo = 0
                if "random" in name:
                    foo = 1
                if "open" in name:
                    task = 0
                if "covert" in name:
                    task = 1
                if "phase" in name:
                    task = 2

                v = report["times"]["events"]

                totals[size, foo, i, task] += v[name]["end"]-v[name]["start"]
                counts[size, foo, i, task] += 1

    avg = totals / counts

    fig, axs = plt.subplots(3, 2, sharex=True, sharey=True)

    for i, size in zip(range(3), ["small", "medium", "large"]):
        for j, foo in zip(range(2), ["identical", "random"]):

            axs[i, j].plot(node_counts, avg[i, j, :, 0], label="open")
            axs[i, j].plot(node_counts, avg[i, j, :, 1], label="covert")
            axs[i, j].plot(node_counts, avg[i, j, :, 2], label="threephase")
            axs[i, j].set_title(f'{size} {foo}')

    axs[2, 1].legend(prop={'size': 6})

    for ax in axs.flat:
        ax.set(xlabel='node count', ylabel='time')
        ax.set_xticks(node_counts)
        # ax.set_xticks(node_counts, labels=[str(n) for n in node_counts])
        ax.set(xscale="log")
        ax.set(yscale="linear")

    # Hide x labels and tick labels for top plots and y ticks for right plots.
    for ax in axs.flat:
        ax.label_outer()

    plt.savefig("benchmarkplots.png")


# generate_benchmark_plot()
# quit()


def make_boxplots_plots():

    plt.boxplot(all_data, positions=sizes, widths=[size/10 for size in sizes])

    plt.xlabel('# of Nodes')
    plt.ylabel('Avg time to completion (ms)')

    plt.xscale('log')
    plt.yscale('log')

    # plt.ticklabel_format(axis='x', style='plain')

    # plt.xticklabels(sizes)

    ax = plt.gca()
    ax.set_xlim(sizes[0]/2, sizes[-1]*2)
    print(plt.xticks())
    plt.xticks(sizes)

    x_formatter = FixedFormatter(sizes)
    x_locator = FixedLocator(sizes)
    ax.xaxis.set_major_formatter(x_formatter)
    # ax.yaxis.set_major_formatter(y_formatter)
    ax.xaxis.set_major_locator(x_locator)
    # ax.yaxis.set_major_locator(y_locator)

    plt.savefig("fig.png")


def make_plots_subtime():
    data = dict()

    data[64] = json.load(open("reconstitution-64-1624489835672.json", "r"))
    data[128] = json.load(open("reconstitution-128-1624490178120.json", "r"))
    data[256] = json.load(open("reconstitution-256-1624491528934.json", "r"))

    all_data = []

    sizes = [64, 128, 256]

    task = "compute::A8-output-final"

    for size in sizes:
        all_data.append(
            [data[size]["reports"][n]["times"]["events"][task]["end"]-data[size]["reports"][n]["times"]["events"][task]["start"] for n in range(len(data[size]["reports"]))]
        )

    plt.boxplot(all_data, positions=sizes, widths=[size/10 for size in sizes])

    plt.xlabel('# of Nodes')
    plt.ylabel('Avg time to completion (ms)')

    plt.xscale('log')
    plt.yscale('log')

    # plt.ticklabel_format(axis='x', style='plain')

    # plt.xticklabels(sizes)

    ax = plt.gca()
    ax.set_xlim(sizes[0]/2, sizes[-1]*2)
    print(plt.xticks())
    plt.xticks(sizes)

    x_formatter = FixedFormatter(sizes)
    x_locator = FixedLocator(sizes)
    ax.xaxis.set_major_formatter(x_formatter)
    # ax.yaxis.set_major_formatter(y_formatter)
    ax.xaxis.set_major_locator(x_locator)
    # ax.yaxis.set_major_locator(y_locator)

    plt.savefig(f"fig{task}.png")
